import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDateTime } from "@chaufx/ui";
import {
  cancelBooking,
  createBooking,
  createCheckoutSession,
  fetchBookingEstimate,
  fetchBookings,
  fetchMapState,
  fetchProfile,
  login,
  requestPasswordReset,
  syncBookingPayment,
  type Session
} from "./src/lib/api";

type Tab = "book" | "trips" | "account";
type ScheduleMode = "now" | "later";
type BookingRequestType = "NOW" | "LATER";
type Coordinate = { latitude: number; longitude: number };
type SearchField = "pickup" | "destination";
type WheelOption = {
  value: number;
  label: string;
};
type PlaceSuggestion = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
const logo = require("./assets/chaufx-mark.png");
const paymentCompleteUrl = "ca.chaufx.customer://payment-complete";
const paymentCancelledUrl = "ca.chaufx.customer://payment-cancelled";
const TRIP_HISTORY_DAYS = 7;

function getDefaultScheduledTime() {
  const date = new Date(Date.now() + 90 * 60 * 1000);
  return {
    date: date.toISOString().slice(0, 10),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  };
}

function toIso(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "Select date"
    : parsed.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function formatTimeLabel(value: string) {
  const parsed = new Date(`2026-01-01T${value}:00`);
  return Number.isNaN(parsed.getTime())
    ? "Select time"
    : parsed.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
}

function toDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function clampDurationHours(value: number) {
  return Math.max(2, Math.min(24, Math.floor(value)));
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function parseDateParts(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  const fallback = new Date();
  const date = Number.isNaN(parsed.getTime()) ? fallback : parsed;

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate()
  };
}

function parseTimeParts(value: string) {
  const [hourValue, minuteValue] = value.split(":").map(Number);
  return {
    hour: Number.isFinite(hourValue) ? hourValue : 0,
    minute: Number.isFinite(minuteValue) ? minuteValue : 0
  };
}

async function searchPlaces(query: string, currentLocation: Coordinate | null) {
  if (!mapboxToken || query.trim().length < 3) {
    return [] as PlaceSuggestion[];
  }

  const params = new URLSearchParams({
    access_token: mapboxToken,
    autocomplete: "true",
    limit: "5",
    language: "en",
    country: "ca"
  });

  if (currentLocation) {
    params.set("proximity", `${currentLocation.longitude},${currentLocation.latitude}`);
  }

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?${params.toString()}`
  );
  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];

  return features
    .filter((feature: any) => Array.isArray(feature.center) && feature.center.length >= 2)
    .map((feature: any) => ({
      id: String(feature.id),
      label: String(feature.place_name ?? feature.text ?? query),
      longitude: Number(feature.center[0]),
      latitude: Number(feature.center[1])
    }));
}

async function fetchRouteGeometry(start: Coordinate, end: Coordinate) {
  if (!mapboxToken) {
    return null;
  }

  const params = new URLSearchParams({
    access_token: mapboxToken,
    geometries: "geojson",
    overview: "full"
  });

  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?${params.toString()}`
  );
  const payload = await response.json();
  const route = payload?.routes?.[0];

  if (!route?.geometry?.coordinates?.length) {
    return null;
  }

  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: route.geometry.coordinates as number[][]
    },
    properties: {}
  };
}

function toneColor(status?: string) {
  const normalized = String(status ?? "").toLowerCase();
  if (["active", "completed"].includes(normalized)) return "#16A34A";
  if (["accepted", "enroute"].includes(normalized)) return "#2563EB";
  if (["awaiting_payment", "pending"].includes(normalized)) return "#D97706";
  if (normalized === "cancelled") return "#DC2626";
  return "#2563EB";
}

function isVisibleTripHistoryItem(booking: any) {
  const normalized = String(booking.status ?? "").toLowerCase();
  if (!["completed", "cancelled"].includes(normalized)) {
    return true;
  }

  const historyDate = new Date(booking.completedAt ?? booking.updatedAt ?? booking.scheduledStartAt);
  if (Number.isNaN(historyDate.getTime())) {
    return false;
  }

  return Date.now() - historyDate.getTime() <= TRIP_HISTORY_DAYS * 24 * 60 * 60 * 1000;
}

function Marker({ color, variant }: { color: string; variant: "current" | "pickup" | "destination" }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (variant !== "pickup") {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true
        })
      ])
    );

    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(1);
    };
  }, [pulse, variant]);

  if (variant === "destination") {
    return <View style={[styles.markerDiamond, { backgroundColor: color }]} />;
  }

  if (variant === "pickup") {
    return (
      <Animated.View
        style={[
          styles.markerPulse,
          { backgroundColor: color, opacity: pulse, transform: [{ scale: pulse }] }
        ]}
      />
    );
  }

  return <View style={[styles.markerCurrent, { backgroundColor: color }]} />;
}

function buildCameraProps(points: Coordinate[], fallback: Coordinate) {
  if (points.length >= 2) {
    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);

    return {
      bounds: {
        ne: [Math.max(...longitudes), Math.max(...latitudes)],
        sw: [Math.min(...longitudes), Math.min(...latitudes)],
        paddingTop: 88,
        paddingRight: 48,
        paddingBottom: 88,
        paddingLeft: 48
      },
      animationMode: "easeTo" as const,
      animationDuration: 600
    };
  }

  return {
    zoomLevel: 12.8,
    centerCoordinate: [fallback.longitude, fallback.latitude] as [number, number],
    animationMode: "easeTo" as const,
    animationDuration: 600
  };
}

function MapSurface({
  currentLocation,
  pickup,
  destination,
  interactive = false,
  onPress
}: {
  currentLocation: Coordinate | null;
  pickup: Coordinate | null;
  destination: Coordinate | null;
  interactive?: boolean;
  onPress?: () => void;
}) {
  const center = pickup ?? currentLocation ?? { latitude: 49.8951, longitude: -97.1384 };
  const cameraPoints = destination ? [pickup ?? currentLocation ?? center, destination] : [center];
  const cameraProps = buildCameraProps(cameraPoints, center);
  const [routeShape, setRouteShape] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    if (!pickup || !destination) {
      setRouteShape(null);
      return;
    }

    fetchRouteGeometry(pickup, destination)
      .then((shape) => {
        if (!cancelled) {
          setRouteShape(shape);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRouteShape(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pickup, destination]);

  if (!mapboxToken) {
    return (
      <View style={styles.mapFallback}>
        <Text style={styles.mapFallbackTitle}>Mapbox token needed</Text>
        <Text style={styles.mapFallbackText}>
          Add `EXPO_PUBLIC_MAPBOX_TOKEN` and run a custom Expo dev build to enable the live map.
        </Text>
      </View>
    );
  }

  return (
    <Mapbox.MapView
      style={styles.map}
      styleURL="mapbox://styles/mapbox/navigation-night-v1"
      compassEnabled={false}
      logoEnabled={false}
      attributionEnabled={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
      onPress={onPress}
    >
      <Mapbox.Camera {...cameraProps} />
      {currentLocation ? (
        <Mapbox.PointAnnotation id="current-location" coordinate={[currentLocation.longitude, currentLocation.latitude]}>
          <Marker color="#22C55E" variant="current" />
        </Mapbox.PointAnnotation>
      ) : null}
      {pickup ? (
        <Mapbox.PointAnnotation id="pickup" coordinate={[pickup.longitude, pickup.latitude]}>
          <Marker color="#F97316" variant="pickup" />
        </Mapbox.PointAnnotation>
      ) : null}
      {destination ? (
        <Mapbox.PointAnnotation id="destination" coordinate={[destination.longitude, destination.latitude]}>
          <Marker color="#2563EB" variant="destination" />
        </Mapbox.PointAnnotation>
      ) : null}
      {routeShape ? (
        <Mapbox.ShapeSource id="route" shape={routeShape}>
          <Mapbox.LineLayer
            id="route-line"
            style={{ lineColor: "#60A5FA", lineWidth: 5, lineOpacity: 0.92, lineCap: "round", lineJoin: "round" }}
          />
        </Mapbox.ShapeSource>
      ) : null}
    </Mapbox.MapView>
  );
}

export default function App() {
  const insets = useSafeAreaInsets();
  const defaults = getDefaultScheduledTime();
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("book");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [passwordResetBusy, setPasswordResetBusy] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [mapState, setMapState] = useState<any>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("now");
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [activeSearchField, setActiveSearchField] = useState<SearchField | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showScheduleDatePicker, setShowScheduleDatePicker] = useState(false);
  const [showScheduleTimePicker, setShowScheduleTimePicker] = useState(false);
  const [fullScreenMapVisible, setFullScreenMapVisible] = useState(false);
  const pickupManuallyEditedRef = useRef(false);
  const [form, setForm] = useState({
    pickupLocation: "",
    pickupLat: "",
    pickupLng: "",
    destinationLocation: "",
    destinationLat: "",
    destinationLng: "",
    scheduledDate: defaults.date,
    scheduledTime: defaults.time,
    durationHours: 2,
    specialNotes: "",
    vehicleDetails: "Toyota Camry - midnight blue",
    zoneCode: "WPG-CENTRAL"
  });
  const isAndroidLoginMode = Platform.OS === "android";

  useEffect(() => {
    if (mapboxToken) {
      Mapbox.setAccessToken(mapboxToken);
    }
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    refreshDashboard();
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    primeCurrentLocation();
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const handlePaymentReturn = async (url: string | null) => {
      if (!url || (!url.includes("payment-complete") && !url.includes("payment-cancelled"))) {
        return;
      }

      const bookingId = url.match(/[?&]bookingId=([^&]+)/)?.[1];
      if (bookingId && url.includes("payment-complete")) {
        try {
          await syncBookingPayment(session.accessToken, decodeURIComponent(bookingId));
          setStatus("Payment recorded. We are now matching your booking with nearby drivers.");
        } catch {
          setStatus("Payment received. Refreshing your booking status.");
        }
      } else if (url.includes("payment-cancelled")) {
        setStatus("Payment was cancelled. You can try again from Trips.");
      }

      setTab("trips");
      await refreshDashboard();
    };

    Linking.getInitialURL().then(handlePaymentReturn).catch(() => undefined);
    const subscription = Linking.addEventListener("url", (event) => {
      handlePaymentReturn(event.url).catch(() => undefined);
    });

    return () => subscription.remove();
  }, [session]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const scheduledStartAt =
      scheduleMode === "now" ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : toIso(form.scheduledDate, form.scheduledTime);

    fetchBookingEstimate(session.accessToken, {
      scheduledStartAt,
      expectedDurationMinutes: clampDurationHours(Number(form.durationHours) || 0) * 60,
      zoneCode: form.zoneCode
    })
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, [form.durationHours, form.scheduledDate, form.scheduledTime, form.zoneCode, scheduleMode, session]);

  useEffect(() => {
    if (!activeSearchField) {
      setSuggestions([]);
      return;
    }

    const query = activeSearchField === "pickup" ? form.pickupLocation : form.destinationLocation;
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timeout = setTimeout(() => {
      searchPlaces(query, currentLocation)
        .then((results) => {
          if (!cancelled) {
            setSuggestions(results);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeSearchField, currentLocation, form.destinationLocation, form.pickupLocation]);

  const pickupCoordinate = useMemo<Coordinate | null>(() => {
    const latitude = Number(form.pickupLat);
    const longitude = Number(form.pickupLng);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }, [form.pickupLat, form.pickupLng]);

  const destinationCoordinate = useMemo<Coordinate | null>(() => {
    if (!form.destinationLocation.trim()) {
      return null;
    }

    const latitude = Number(form.destinationLat);
    const longitude = Number(form.destinationLng);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }, [form.destinationLat, form.destinationLng, form.destinationLocation]);

  const selectedDateParts = useMemo(() => parseDateParts(form.scheduledDate), [form.scheduledDate]);
  const selectedTimeParts = useMemo(() => parseTimeParts(form.scheduledTime), [form.scheduledTime]);
  const androidMonthOptions = useMemo<WheelOption[]>(
    () =>
      Array.from({ length: 12 }, (_, month) => ({
        value: month,
        label: new Date(2026, month, 1).toLocaleDateString("en-CA", { month: "short" })
      })),
    []
  );
  const androidYearOptions = useMemo<WheelOption[]>(() => {
    const startYear = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, index) => {
      const year = startYear + index;
      return { value: year, label: String(year) };
    });
  }, []);
  const androidDayOptions = useMemo<WheelOption[]>(() => {
    const totalDays = getDaysInMonth(selectedDateParts.year, selectedDateParts.month);
    return Array.from({ length: totalDays }, (_, index) => ({
      value: index + 1,
      label: String(index + 1).padStart(2, "0")
    }));
  }, [selectedDateParts.month, selectedDateParts.year]);
  const androidHourOptions = useMemo<WheelOption[]>(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        value: hour,
        label: String(hour).padStart(2, "0")
      })),
    []
  );
  const androidMinuteOptions = useMemo<WheelOption[]>(
    () =>
      Array.from({ length: 60 }, (_, minute) => ({
        value: minute,
        label: String(minute).padStart(2, "0")
      })),
    []
  );

  const activeBooking = bookings.find((booking) =>
    ["awaiting_payment", "pending", "accepted", "enroute", "active"].includes(String(booking.status).toLowerCase())
  );
  const visibleTripHistory = useMemo(
    () => bookings.filter((booking) => booking.id !== activeBooking?.id && isVisibleTripHistoryItem(booking)),
    [activeBooking?.id, bookings]
  );
  const awaitingPaymentBooking = bookings.find(
    (booking) =>
      String(booking.status).toLowerCase() === "awaiting_payment" &&
      String(booking.payment?.status ?? "").toLowerCase() !== "recorded"
  );

  async function refreshDashboard() {
    if (!session?.accessToken) {
      return;
    }

    setRefreshing(true);
    try {
      const [bookingList, me] = await Promise.all([
        fetchBookings(session.accessToken),
        fetchProfile(session.accessToken)
      ]);

      setBookings(bookingList);
      setProfile(me);

      const trackableBooking = bookingList.find((booking) =>
        ["accepted", "enroute", "active"].includes(String(booking.status).toLowerCase())
      );
      if (trackableBooking) {
        setMapState(await fetchMapState(session.accessToken, trackableBooking.id));
      } else {
        setMapState(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to refresh your account.");
    } finally {
      setRefreshing(false);
    }
  }

  async function primeCurrentLocation() {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status === "undetermined") {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (requested.status !== "granted") {
          return;
        }
      } else if (permission.status !== "granted") {
        return;
      }

      const current =
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)) ??
        (await Location.getLastKnownPositionAsync());

      if (!current) {
        return;
      }

      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      };
      setCurrentLocation(coords);

      const reverse = await Location.reverseGeocodeAsync(coords);
      const label = reverse[0]
        ? [
            reverse[0].name,
            reverse[0].street,
            reverse[0].city,
            reverse[0].region
          ]
            .filter(Boolean)
            .join(", ")
        : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

      setForm((currentForm) =>
        pickupManuallyEditedRef.current
          ? currentForm
          : {
              ...currentForm,
              pickupLocation: label,
              pickupLat: String(coords.latitude),
              pickupLng: String(coords.longitude)
            }
      );
    } catch {
      // Keep the map usable even if device location isn't available yet.
    }
  }

  async function handleLogin() {
    setBusy(true);
    setStatus("");
    try {
      const nextSession = await login(loginEmail.trim(), loginPassword);
      setSession(nextSession);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestPasswordReset() {
    const email = loginEmail.trim();
    if (!email) {
      setStatus("Enter your email address to request a password reset.");
      return;
    }

    setPasswordResetBusy(true);
    try {
      await requestPasswordReset(email);
      setStatus("If the account exists, a password reset link has been sent to the email address.");
      Alert.alert("Reset link sent", "If the account exists, a password reset link has been sent to the email address.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to request a password reset.");
    } finally {
      setPasswordResetBusy(false);
    }
  }

  function handleDateChange(event: any, nextDate?: Date) {
    if (Platform.OS === "android") {
      setShowScheduleDatePicker(false);
    }
    if (event.type !== "set" || !nextDate) {
      return;
    }
    setForm((currentForm) => ({
      ...currentForm,
      scheduledDate: nextDate.toISOString().slice(0, 10)
    }));
  }

  function handleTimeChange(event: any, nextTime?: Date) {
    if (Platform.OS === "android") {
      setShowScheduleTimePicker(false);
    }
    if (event.type !== "set" || !nextTime) {
      return;
    }
    setForm((currentForm) => ({
      ...currentForm,
      scheduledTime: `${String(nextTime.getHours()).padStart(2, "0")}:${String(nextTime.getMinutes()).padStart(2, "0")}`
    }));
  }

  function closeAndroidSchedulePicker() {
    setShowScheduleDatePicker(false);
    setShowScheduleTimePicker(false);
  }

  function selectAndroidDatePart(part: "month" | "day" | "year", value: number) {
    const next = { ...selectedDateParts, [part]: value };
    const day = Math.min(next.day, getDaysInMonth(next.year, next.month));

    setForm((currentForm) => ({
      ...currentForm,
      scheduledDate: toDateValue(new Date(next.year, next.month, day, 12, 0, 0))
    }));
  }

  function selectAndroidTimePart(part: "hour" | "minute", value: number) {
    const next = { ...selectedTimeParts, [part]: value };

    setForm((currentForm) => ({
      ...currentForm,
      scheduledTime: `${String(next.hour).padStart(2, "0")}:${String(next.minute).padStart(2, "0")}`
    }));
  }

  function renderAndroidWheelColumn(
    label: string,
    options: WheelOption[],
    selectedValue: number,
    onSelect: (value: number) => void
  ) {
    return (
      <View style={styles.androidWheelColumn}>
        <Text style={styles.androidWheelLabel}>{label}</Text>
        <ScrollView
          style={styles.androidWheelScroll}
          contentContainerStyle={styles.androidWheelContent}
          showsVerticalScrollIndicator={false}
        >
          {options.map((option) => {
            const selected = option.value === selectedValue;

            return (
              <Pressable
                key={`${label}-${option.value}`}
                style={[styles.androidWheelItem, selected && styles.androidWheelItemActive]}
                onPress={() => onSelect(option.value)}
              >
                <Text style={[styles.androidWheelItemText, selected && styles.androidWheelItemTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  async function openCheckoutForBooking(bookingId: string, manageBusy = true) {
    if (!session?.accessToken) {
      return;
    }

    if (manageBusy) {
      setBusy(true);
    }

    try {
      const checkout = await createCheckoutSession(session.accessToken, bookingId, {
        successReturnUrl: paymentCompleteUrl,
        cancelReturnUrl: paymentCancelledUrl
      });

      if (checkout.alreadyPaid) {
        setStatus("Payment has already been recorded for this booking.");
        await refreshDashboard();
        return;
      }

      if (!checkout.checkoutUrl) {
        throw new Error("Stripe checkout is not available for this booking yet.");
      }

      setStatus("Opening secure Stripe checkout.");
      await Linking.openURL(checkout.checkoutUrl);
    } finally {
      if (manageBusy) {
        setBusy(false);
      }
    }
  }

  async function submitBooking(nextMode: ScheduleMode) {
    if (!session?.accessToken) {
      return;
    }

    setBusy(true);
    try {
      const pickupGeocode = await Location.geocodeAsync(form.pickupLocation.trim());
      const destinationGeocode = await Location.geocodeAsync(form.destinationLocation.trim());

      const pickupPoint =
        pickupGeocode[0] ??
        (currentLocation
          ? {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude
            }
          : null);

      const destinationPoint = destinationGeocode[0] ?? null;

      if (!pickupPoint) {
        throw new Error("Please enter a pickup address we can locate.");
      }

      if (!destinationPoint) {
        throw new Error("Please enter a destination address we can locate.");
      }

      setForm((currentForm) => ({
        ...currentForm,
        pickupLat: String(pickupPoint.latitude),
        pickupLng: String(pickupPoint.longitude),
        destinationLat: String(destinationPoint.latitude),
        destinationLng: String(destinationPoint.longitude)
      }));

      const scheduledStartAt =
        nextMode === "now"
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : toIso(form.scheduledDate, form.scheduledTime);

      const result = await createBooking(session.accessToken, {
        requestType: (nextMode === "now" ? "NOW" : "LATER") satisfies BookingRequestType,
        pickupLocation: form.pickupLocation,
        pickupLat: pickupPoint.latitude,
        pickupLng: pickupPoint.longitude,
        destinationLocation: form.destinationLocation,
        destinationLat: destinationPoint.latitude,
        destinationLng: destinationPoint.longitude,
        scheduledStartAt,
        expectedDurationMinutes: clampDurationHours(Number(form.durationHours) || 0) * 60,
        specialNotes: form.specialNotes.trim() || undefined,
        vehicleDetails: form.vehicleDetails.trim() || undefined,
        zoneCode: form.zoneCode
      });

      const bookingId = result?.booking?.id ?? result?.id;
      if (!bookingId) {
        throw new Error("Booking was created, but checkout could not be started. Please refresh and try again.");
      }

      setStatus("Booking created. Complete payment to start driver matching.");
      setTab("trips");
      await refreshDashboard();
      await openCheckoutForBooking(bookingId, false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit your booking.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!session?.accessToken) {
      return;
    }

    setBusy(true);
    try {
      await cancelBooking(session.accessToken, bookingId);
      setStatus("Booking cancelled.");
      await refreshDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to cancel this booking.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setSession(null);
    setProfile(null);
    setBookings([]);
    setMapState(null);
    setEstimate(null);
    setTab("book");
    setStatus("");
  }

  async function handleRefreshPayment(bookingId: string) {
    if (!session?.accessToken) {
      return;
    }

    setBusy(true);
    try {
      await syncBookingPayment(session.accessToken, bookingId);
      setStatus("Payment status refreshed.");
      await refreshDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to refresh payment status.");
    } finally {
      setBusy(false);
    }
  }

  function renderPaymentBlock(booking: any) {
    const bookingStatus = String(booking.status ?? "").toLowerCase();
    const paymentStatus = String(booking.payment?.status ?? "").toLowerCase();
    const isPaid = paymentStatus === "recorded";
    const needsPayment = !isPaid && bookingStatus === "awaiting_payment";

    if (!isPaid && !needsPayment) {
      return null;
    }

    const amount = Number(booking.payment?.amount ?? booking.fareEstimate ?? 0);

    return (
      <View style={styles.paymentBlock}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentLabel}>Payment</Text>
          <Text style={[styles.paymentStatus, isPaid ? styles.paymentStatusPaid : styles.paymentStatusDue]}>
            {isPaid ? "Paid" : "Required"}
          </Text>
        </View>
        <Text style={styles.paymentAmount}>${amount.toFixed(2)} CAD</Text>
        <Text style={styles.paymentCopy}>
          {isPaid
            ? "Your payment has been recorded for this booking."
            : "Complete payment securely before driver matching begins."}
        </Text>
        {needsPayment ? (
          <View style={styles.paymentActions}>
            <Pressable
              style={[styles.paymentPrimaryButton, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={() => openCheckoutForBooking(booking.id)}
            >
              <Text style={styles.paymentPrimaryText}>Pay now</Text>
            </Pressable>
            <Pressable
              style={[styles.paymentSecondaryButton, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={() => handleRefreshPayment(booking.id)}
            >
              <Text style={styles.paymentSecondaryText}>Refresh</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  function renderMapLegend() {
    return (
      <View style={styles.mapLegend}>
        <View style={styles.mapLegendPill}>
          <View style={[styles.legendPulse, { backgroundColor: "#F97316" }]} />
          <Text style={styles.mapLegendText}>Pickup</Text>
        </View>
        <View style={styles.mapLegendPill}>
          <View style={[styles.legendDiamond, { backgroundColor: "#2563EB" }]} />
          <Text style={styles.mapLegendText}>Dropoff</Text>
        </View>
      </View>
    );
  }

  function applySuggestion(field: SearchField, suggestion: PlaceSuggestion) {
    if (field === "pickup") {
      pickupManuallyEditedRef.current = true;
    }

    setForm((currentForm) =>
      field === "pickup"
        ? {
            ...currentForm,
            pickupLocation: suggestion.label,
            pickupLat: String(suggestion.latitude),
            pickupLng: String(suggestion.longitude)
          }
        : {
            ...currentForm,
            destinationLocation: suggestion.label,
            destinationLat: String(suggestion.latitude),
            destinationLng: String(suggestion.longitude)
          }
    );
    setActiveSearchField(null);
    setSuggestions([]);
  }

  if (!session) {
    const loginPanel = (
      <View
        style={[
          styles.loginPanel,
          isAndroidLoginMode ? styles.loginPanelCompact : null,
          isAndroidLoginMode ? styles.loginPanelAndroid : null
        ]}
      >
        <Image
          source={logo}
          style={[styles.loginLogo, isAndroidLoginMode ? styles.loginLogoCompact : null]}
          resizeMode="contain"
        />
        <Text style={[styles.loginEyebrow, isAndroidLoginMode ? styles.loginEyebrowCompact : null]}>
          CHAUFX CANADA
        </Text>
        <Text style={[styles.loginTitle, isAndroidLoginMode ? styles.loginTitleCompact : null]}>Welcome</Text>

        <View style={[styles.loginCard, isAndroidLoginMode ? styles.loginCardCompact : null]}>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
            value={loginEmail}
            onChangeText={setLoginEmail}
            showSoftInputOnFocus
          />
          <View style={styles.passwordFieldRow}>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showLoginPassword}
              style={styles.passwordInput}
              value={loginPassword}
              onChangeText={setLoginPassword}
              showSoftInputOnFocus
            />
            <Pressable onPress={() => setShowLoginPassword((current) => !current)}>
              <Text style={styles.passwordToggleText}>{showLoginPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>
          <Pressable disabled={passwordResetBusy} onPress={handleRequestPasswordReset}>
            <Text style={styles.linkText}>{passwordResetBusy ? "Sending reset link..." : "Forgot password?"}</Text>
          </Pressable>
          <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} disabled={busy} onPress={handleLogin}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Sign in</Text>}
          </Pressable>
        </View>

        {status ? <Text style={styles.statusText}>{status}</Text> : null}
      </View>
    );

    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        {Platform.OS === "android" ? (
          <View
            style={[
              styles.androidLoginShell,
              {
                paddingTop: Math.max(insets.top, 18) + 12,
                paddingBottom: Math.max(insets.bottom, 20) + 20
              }
            ]}
          >
            {loginPanel}
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.keyboardWrap}
            behavior="padding"
            keyboardVerticalOffset={8}
          >
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[
                styles.contentGrow,
                styles.loginWrap,
                {
                  paddingTop: Math.max(insets.top, 18) + 20,
                  paddingBottom: Math.max(insets.bottom, 24) + 140
                }
              ]}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              scrollEnabled
            >
              {loginPanel}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, styles.contentGrow, { paddingTop: Math.max(insets.top, 10) + 12, paddingBottom: 52 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          nestedScrollEnabled
        >
          <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>Customer app</Text>
            <Text style={styles.headerTitle}>Hello {profile?.fullName?.split(" ")[0] ?? "there"}</Text>
          </View>
          <Pressable style={styles.ghostButton} onPress={refreshDashboard}>
            <Text style={styles.ghostButtonText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>

        <View style={styles.mapCard} pointerEvents="box-none">
          <View style={styles.mapFrame} pointerEvents="none">
            <MapSurface currentLocation={currentLocation} pickup={pickupCoordinate} destination={destinationCoordinate} />
          </View>
          <Pressable style={styles.mapTapLayer} onPress={() => setFullScreenMapVisible(true)}>
            <Text style={styles.mapTapText}>Tap for full map</Text>
          </Pressable>
          {renderMapLegend()}
        </View>

        <View style={styles.tabRow}>
          {[
            ["book", "Book"],
            ["trips", "Trips"],
            ["account", "Account"]
          ].map(([key, label]) => (
            <Pressable key={key} style={[styles.tabButton, tab === key && styles.tabButtonActive]} onPress={() => setTab(key as Tab)}>
              <Text style={[styles.tabButtonText, tab === key && styles.tabButtonTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "book" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Confirm pickup and destination address</Text>
            <View style={styles.fieldStack}>
              <View style={styles.addressInputRow}>
                <View style={styles.addressIconWrap}>
                  <View style={styles.pickupAddressIcon} />
                </View>
                <TextInput
                  style={styles.addressInput}
                  value={form.pickupLocation}
                  onChangeText={(value) => {
                    pickupManuallyEditedRef.current = true;
                    setForm((currentForm) => ({
                      ...currentForm,
                      pickupLocation: value,
                      pickupLat: "",
                      pickupLng: ""
                    }));
                    setActiveSearchField("pickup");
                  }}
                  onFocus={() => setActiveSearchField("pickup")}
                  placeholder="Pickup address"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {activeSearchField === "pickup" && suggestions.length > 0 ? (
                <View style={styles.suggestionPanel}>
                  {suggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion.id}
                      style={styles.suggestionRow}
                      onPress={() => applySuggestion("pickup", suggestion)}
                    >
                    <Text style={styles.suggestionText}>{suggestion.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <View style={styles.addressInputRow}>
                <View style={styles.addressIconWrap}>
                  <View style={styles.destinationAddressIcon} />
                </View>
                <TextInput
                  style={styles.addressInput}
                  value={form.destinationLocation}
                  onChangeText={(value) => {
                    setForm((currentForm) => ({
                      ...currentForm,
                      destinationLocation: value,
                      destinationLat: "",
                      destinationLng: ""
                    }));
                    setActiveSearchField("destination");
                  }}
                  onFocus={() => setActiveSearchField("destination")}
                  placeholder="Destination address"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {activeSearchField === "destination" && suggestions.length > 0 ? (
                <View style={styles.suggestionPanel}>
                  {suggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion.id}
                      style={styles.suggestionRow}
                      onPress={() => applySuggestion("destination", suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextInput
                style={styles.input}
                value={form.vehicleDetails}
                onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, vehicleDetails: value }))}
                placeholder="Your vehicle"
                placeholderTextColor="#94A3B8"
              />
              <TextInput
                style={styles.input}
                value={form.specialNotes}
                onChangeText={(value) => setForm((currentForm) => ({ ...currentForm, specialNotes: value }))}
                placeholder="Special notes (optional)"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <Text style={styles.panelTitle}>Request ride</Text>
            <View style={styles.modeRow}>
              {[
                ["now", "Book Now"],
                ["later", "Schedule later"]
              ].map(([key, label]) => (
                <Pressable
                  key={key}
                  style={[styles.modeButton, scheduleMode === key && styles.modeButtonActive]}
                  onPress={() => setScheduleMode(key as ScheduleMode)}
                >
                  <Text style={[styles.modeButtonText, scheduleMode === key && styles.modeButtonTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.bookingDetailsCard}>
              <Text style={styles.detailsBlockTitle}>Booking details</Text>
              {scheduleMode === "later" ? (
                <View style={styles.scheduleCard}>
                  <View style={styles.schedulePickerCard}>
                    {Platform.OS === "ios" ? (
                      <View style={styles.inlinePickerWrapSolo}>
                        <DateTimePicker
                          mode="date"
                          display="compact"
                          value={new Date(`${form.scheduledDate}T12:00:00`)}
                          onValueChange={handleDateChange}
                        />
                      </View>
                    ) : (
                      <Pressable
                        style={styles.scheduleButton}
                        onPress={() => setShowScheduleDatePicker(true)}
                      >
                        <Text style={styles.scheduleLabel}>Date</Text>
                        <Text style={styles.scheduleValue}>{formatDateLabel(form.scheduledDate)}</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.schedulePickerCard}>
                    {Platform.OS === "ios" ? (
                      <View style={styles.inlinePickerWrapSolo}>
                        <DateTimePicker
                          mode="time"
                          display="compact"
                          value={new Date(`2026-01-01T${form.scheduledTime}:00`)}
                          onValueChange={handleTimeChange}
                        />
                      </View>
                    ) : (
                      <Pressable
                        style={styles.scheduleButton}
                        onPress={() => setShowScheduleTimePicker(true)}
                      >
                        <Text style={styles.scheduleLabel}>Time</Text>
                        <Text style={styles.scheduleValue}>{formatTimeLabel(form.scheduledTime)}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : null}

              <View style={styles.hoursRow}>
                <View style={styles.hoursStepper}>
                  <Pressable
                    style={styles.hoursStepperButton}
                    onPress={() =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        durationHours: clampDurationHours(currentForm.durationHours - 1)
                      }))
                    }
                  >
                    <Text style={styles.hoursStepperButtonText}>−</Text>
                  </Pressable>
                  <View style={styles.hoursStepperValueWrap}>
                    <Text style={styles.hoursStepperValue}>{form.durationHours}</Text>
                    <Text style={styles.hoursStepperUnit}>hours</Text>
                  </View>
                  <Pressable
                    style={styles.hoursStepperButton}
                    onPress={() =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        durationHours: clampDurationHours(currentForm.durationHours + 1)
                      }))
                    }
                  >
                    <Text style={styles.hoursStepperButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.estimateRow}>
                <View>
                  <Text style={styles.estimateLabel}>Estimated fare</Text>
                  <Text style={styles.estimateValue}>
                    {estimate?.fareEstimate ? `$${Number(estimate.fareEstimate).toFixed(2)}` : "Pending"}
                  </Text>
                </View>
                <Text style={styles.estimateMeta}>
                  {estimate?.billableHours
                    ? `${estimate.billableHours} billable hour${estimate.billableHours === 1 ? "" : "s"} at $${estimate.flatFeePerHour}/hour`
                    : scheduleMode === "now"
                      ? "Maps unlock shortly before the trip window."
                      : "Trip tracking opens inside the approved window."}
                </Text>
              </View>
              {scheduleMode === "now" ? (
                <Text style={styles.detailsFooterNote}>Pickup window starts about 15 minutes from now.</Text>
              ) : null}
            </View>

            <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} disabled={busy} onPress={() => submitBooking(scheduleMode)}>
              <Text style={styles.primaryButtonText}>{scheduleMode === "now" ? "Book Now" : "Schedule a drive"}</Text>
            </Pressable>
          </View>
        ) : null}

        {tab === "trips" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Trips</Text>
            {activeBooking ? (
              <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingTagRow}>
                    <Text style={[styles.bookingStatus, { color: toneColor(activeBooking.status) }]}>{String(activeBooking.status).toUpperCase()}</Text>
                    <Text style={styles.requestTypeChip}>{activeBooking.requestType === "NOW" ? "Book Now" : "Schedule later"}</Text>
                  </View>
                  {["awaiting_payment", "pending", "accepted"].includes(String(activeBooking.status).toLowerCase()) ? (
                    <Pressable onPress={() => handleCancel(activeBooking.id)}>
                      <Text style={styles.linkText}>Cancel</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.bookingTitle}>{activeBooking.pickupLocation}</Text>
                <Text style={styles.bookingCopy}>{activeBooking.destinationLocation}</Text>
                <Text style={styles.bookingMeta}>{formatDateTime(activeBooking.scheduledStartAt)}</Text>
                {mapState ? (
                  <View style={styles.infoStrip}>
                    <Text style={styles.infoStripText}>
                      {mapState.active ? "Tracking is active for this trip." : "Tracking is locked until the approved trip window opens."}
                    </Text>
                  </View>
                ) : null}
                {String(activeBooking.status).toLowerCase() === "awaiting_payment" ? (
                  <View style={styles.infoStrip}>
                    <Text style={styles.infoStripText}>Complete payment before driver matching begins.</Text>
                  </View>
                ) : null}
                {renderPaymentBlock(activeBooking)}
              </View>
            ) : (
              <Text style={styles.emptyText}>No active booking yet.</Text>
            )}

            {visibleTripHistory.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingTagRow}>
                  <Text style={[styles.bookingStatus, { color: toneColor(booking.status) }]}>{String(booking.status).toUpperCase()}</Text>
                  <Text style={styles.requestTypeChip}>{booking.requestType === "NOW" ? "Book Now" : "Schedule later"}</Text>
                </View>
                <Text style={styles.bookingTitle}>{booking.pickupLocation}</Text>
                <Text style={styles.bookingCopy}>{booking.destinationLocation}</Text>
                <Text style={styles.bookingMeta}>{formatDateTime(booking.scheduledStartAt)}</Text>
                {renderPaymentBlock(booking)}
              </View>
            ))}
          </View>
        ) : null}

        {tab === "account" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Account</Text>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Name</Text>
              <Text style={styles.accountValue}>{profile?.fullName ?? session.user.fullName}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Email</Text>
              <Text style={styles.accountValue}>{profile?.email ?? session.user.email}</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={logout}>
              <Text style={styles.secondaryButtonText}>Log out</Text>
            </Pressable>
          </View>
        ) : null}

          {status ? <Text style={styles.statusText}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={fullScreenMapVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setFullScreenMapVisible(false)}
      >
        <View style={styles.fullMapScreen}>
          <MapSurface
            currentLocation={currentLocation}
            pickup={pickupCoordinate}
            destination={destinationCoordinate}
            interactive
          />
          {renderMapLegend()}
          <Pressable style={[styles.fullMapClose, { top: Math.max(insets.top, 16) + 10 }]} onPress={() => setFullScreenMapVisible(false)}>
            <Text style={styles.fullMapCloseText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
      <Modal visible={Boolean(awaitingPaymentBooking)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => undefined}>
        <SafeAreaView style={styles.paymentGateScreen}>
          {awaitingPaymentBooking ? (
            <ScrollView
              contentContainerStyle={styles.paymentGateContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.paymentGateCard}>
                <View style={styles.bookingTagRow}>
                  <Text style={[styles.bookingStatus, { color: toneColor(awaitingPaymentBooking.status) }]}>
                    {String(awaitingPaymentBooking.status).replace("_", " ").toUpperCase()}
                  </Text>
                  <Text style={styles.requestTypeChip}>{awaitingPaymentBooking.requestType === "NOW" ? "Book Now" : "Schedule later"}</Text>
                </View>
                <Text style={styles.bookingTitle}>{awaitingPaymentBooking.pickupLocation}</Text>
                <Text style={styles.bookingCopy}>{awaitingPaymentBooking.destinationLocation}</Text>
                <Text style={styles.bookingMeta}>{formatDateTime(awaitingPaymentBooking.scheduledStartAt)}</Text>
                {renderPaymentBlock(awaitingPaymentBooking)}
                <Pressable
                  style={[styles.paymentGateCancelButton, busy && styles.buttonDisabled]}
                  disabled={busy}
                  onPress={() => handleCancel(awaitingPaymentBooking.id)}
                >
                  <Text style={styles.paymentGateCancelText}>Cancel booking</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
      {Platform.OS === "android" ? (
        <Modal
          transparent
          visible={showScheduleDatePicker || showScheduleTimePicker}
          animationType="fade"
          onRequestClose={closeAndroidSchedulePicker}
        >
          <Pressable style={styles.androidPickerOverlay} onPress={closeAndroidSchedulePicker}>
            <Pressable style={styles.androidPickerSheet} onPress={(event) => event.stopPropagation()}>
              <View style={styles.androidPickerHandle} />
              <View style={styles.androidPickerHeader}>
                <View>
                  <Text style={styles.androidPickerEyebrow}>Schedule later</Text>
                  <Text style={styles.androidPickerTitle}>
                    {showScheduleDatePicker ? "Choose pickup date" : "Choose pickup time"}
                  </Text>
                </View>
                <Pressable style={styles.androidPickerCloseButton} onPress={closeAndroidSchedulePicker}>
                  <Text style={styles.androidPickerCloseText}>Close</Text>
                </Pressable>
              </View>
              <View style={styles.androidWheelSummary}>
                <Text style={styles.androidWheelSummaryText}>
                  {showScheduleDatePicker ? formatDateLabel(form.scheduledDate) : formatTimeLabel(form.scheduledTime)}
                </Text>
              </View>
              {showScheduleDatePicker ? (
                <View style={styles.androidWheelRow}>
                  {renderAndroidWheelColumn("Month", androidMonthOptions, selectedDateParts.month, (value) =>
                    selectAndroidDatePart("month", value)
                  )}
                  {renderAndroidWheelColumn("Day", androidDayOptions, selectedDateParts.day, (value) =>
                    selectAndroidDatePart("day", value)
                  )}
                  {renderAndroidWheelColumn("Year", androidYearOptions, selectedDateParts.year, (value) =>
                    selectAndroidDatePart("year", value)
                  )}
                </View>
              ) : (
                <View style={styles.androidWheelRow}>
                  {renderAndroidWheelColumn("Hour", androidHourOptions, selectedTimeParts.hour, (value) =>
                    selectAndroidTimePart("hour", value)
                  )}
                  {renderAndroidWheelColumn("Minute", androidMinuteOptions, selectedTimeParts.minute, (value) =>
                    selectAndroidTimePart("minute", value)
                  )}
                </View>
              )}
              <Pressable style={styles.androidPickerDoneButton} onPress={closeAndroidSchedulePicker}>
                <Text style={styles.androidPickerDoneText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#081930"
  },
  keyboardWrap: {
    flex: 1
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    gap: 16
  },
  contentGrow: {
    flexGrow: 1
  },
  loginWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: "flex-start"
  },
  androidLoginShell: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "flex-start"
  },
  loginPanel: {
    borderRadius: 28,
    backgroundColor: "#0F172A",
    paddingHorizontal: 28,
    paddingVertical: 30,
    gap: 16
  },
  loginPanelCompact: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 12
  },
  loginPanelAndroid: {
    marginTop: 48
  },
  loginLogo: {
    width: 108,
    height: 108,
    alignSelf: "center"
  },
  loginLogoCompact: {
    width: 74,
    height: 74
  },
  loginEyebrow: {
    color: "#60A5FA",
    fontSize: 11,
    letterSpacing: 2.4,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 2
  },
  loginEyebrowCompact: {
    fontSize: 10,
    letterSpacing: 2.1
  },
  loginTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.5,
    marginTop: 2
  },
  loginTitleCompact: {
    fontSize: 19,
    marginTop: 0
  },
  loginCopy: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
    alignSelf: "center"
  },
  loginCard: {
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    marginTop: 2
  },
  loginCardCompact: {
    padding: 14,
    gap: 10
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerLabel: {
    color: "#60A5FA",
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4
  },
  ghostButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  ghostButtonText: {
    color: "#E2E8F0",
    fontWeight: "600"
  },
  mapCard: {
    height: 332,
    position: "relative"
  },
  mapFrame: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
    backgroundColor: "#0F172A"
  },
  map: {
    flex: 1
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0F172A"
  },
  mapFallbackTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700"
  },
  mapFallbackText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10
  },
  markerCurrent: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#081930",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4
  },
  markerPulse: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#081930",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4
  },
  markerDiamond: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
    shadowColor: "#081930",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4
  },
  mapLegend: {
    position: "absolute",
    top: 14,
    right: 14,
    gap: 8,
    zIndex: 3
  },
  mapLegendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.82)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  mapLegendText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "700"
  },
  legendPulse: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  legendDiamond: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }]
  },
  mapTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 14
  },
  mapTapText: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.78)",
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  fullMapScreen: {
    flex: 1,
    backgroundColor: "#081930"
  },
  fullMapClose: {
    position: "absolute",
    right: 16,
    zIndex: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  fullMapCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  tabRow: {
    flexDirection: "row",
    gap: 10
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#111C30",
    paddingVertical: 12,
    alignItems: "center"
  },
  tabButtonActive: {
    backgroundColor: "#2563EB"
  },
  tabButtonText: {
    color: "#CBD5E1",
    fontWeight: "600"
  },
  tabButtonTextActive: {
    color: "#FFFFFF"
  },
  panel: {
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    padding: 18,
    gap: 14
  },
  panelTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700"
  },
  detailsBlockTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700"
  },
  helperText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20
  },
  fieldStack: {
    gap: 12
  },
  suggestionPanel: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    overflow: "hidden"
  },
  suggestionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7"
  },
  suggestionText: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 20
  },
  suggestionHint: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  input: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#0F172A",
    fontSize: 16
  },
  addressInputRow: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    paddingLeft: 14,
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  addressIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center"
  },
  pickupAddressIcon: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#F97316",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#F97316",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  destinationAddressIcon: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  addressInput: {
    flex: 1,
    color: "#0F172A",
    fontSize: 16,
    paddingVertical: 14
  },
  passwordFieldRow: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    paddingLeft: 16,
    paddingRight: 14,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  passwordInput: {
    flex: 1,
    color: "#0F172A",
    fontSize: 16,
    paddingVertical: 14
  },
  passwordToggleText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
    paddingVertical: 14,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#4338CA",
    fontWeight: "700"
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  modeRow: {
    flexDirection: "row",
    gap: 10
  },
  modeButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    paddingVertical: 13,
    alignItems: "center"
  },
  modeButtonActive: {
    backgroundColor: "#0F172A"
  },
  modeButtonText: {
    color: "#334155",
    fontWeight: "700"
  },
  modeButtonTextActive: {
    color: "#FFFFFF"
  },
  bookingDetailsCard: {
    borderRadius: 22,
    backgroundColor: "#EEF4FF",
    padding: 14,
    gap: 12
  },
  scheduleCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch"
  },
  hoursCard: {
    gap: 10
  },
  hoursRow: {
    alignItems: "center"
  },
  hoursStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    padding: 8
  },
  hoursStepperButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center"
  },
  hoursStepperButtonText: {
    color: "#4338CA",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28
  },
  hoursStepperValueWrap: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  hoursStepperValue: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800"
  },
  hoursStepperUnit: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  schedulePickerCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    overflow: "hidden"
  },
  scheduleButton: {
    padding: 14
  },
  inlinePickerWrap: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingBottom: 8,
    alignItems: "center"
  },
  inlinePickerWrapSolo: {
    minHeight: 56,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  scheduleLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  scheduleValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6
  },
  estimateRow: {
    borderRadius: 20,
    backgroundColor: "#E0F2FE",
    padding: 16,
    gap: 6
  },
  estimateLabel: {
    color: "#0369A1",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  estimateValue: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800"
  },
  estimateMeta: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20
  },
  detailsFooterNote: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19
  },
  bookingCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 6
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bookingTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  bookingStatus: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.3
  },
  requestTypeChip: {
    borderRadius: 999,
    backgroundColor: "#E0E7FF",
    color: "#4338CA",
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  linkText: {
    color: "#2563EB",
    fontWeight: "700"
  },
  bookingTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700"
  },
  bookingCopy: {
    color: "#475569",
    fontSize: 15
  },
  bookingMeta: {
    color: "#64748B",
    fontSize: 13
  },
  paymentBlock: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 8
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  paymentLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  paymentStatus: {
    fontSize: 13,
    fontWeight: "800"
  },
  paymentStatusPaid: {
    color: "#16A34A"
  },
  paymentStatusDue: {
    color: "#D97706"
  },
  paymentAmount: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800"
  },
  paymentCopy: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20
  },
  paymentActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4
  },
  paymentPrimaryButton: {
    borderRadius: 18,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  paymentPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  paymentSecondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  paymentSecondaryText: {
    color: "#4338CA",
    fontSize: 15,
    fontWeight: "800"
  },
  paymentGateScreen: {
    flex: 1,
    backgroundColor: "#081930"
  },
  paymentGateContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    gap: 12
  },
  paymentGateCard: {
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    gap: 10
  },
  paymentGateCancelButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    alignItems: "center"
  },
  paymentGateCancelText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "800"
  },
  infoStrip: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    padding: 14
  },
  infoStripText: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 19
  },
  emptyText: {
    color: "#64748B",
    fontSize: 15
  },
  accountRow: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16
  },
  accountLabel: {
    color: "#64748B",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontWeight: "700"
  },
  accountValue: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6
  },
  androidPickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 25, 48, 0.62)",
    padding: 14
  },
  androidPickerSheet: {
    maxHeight: "74%",
    borderRadius: 30,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    shadowColor: "#020617",
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    elevation: 16
  },
  androidPickerHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginBottom: 16
  },
  androidPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14
  },
  androidPickerEyebrow: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4
  },
  androidPickerTitle: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800"
  },
  androidPickerCloseButton: {
    borderRadius: 999,
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  androidPickerCloseText: {
    color: "#4338CA",
    fontSize: 13,
    fontWeight: "800"
  },
  androidWheelSummary: {
    borderRadius: 18,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    alignItems: "center"
  },
  androidWheelSummaryText: {
    color: "#1D4ED8",
    fontSize: 16,
    fontWeight: "800"
  },
  androidWheelRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10
  },
  androidWheelColumn: {
    flex: 1,
    minWidth: 0
  },
  androidWheelLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 8
  },
  androidWheelScroll: {
    height: 210,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  androidWheelContent: {
    gap: 6,
    paddingVertical: 8
  },
  androidWheelItem: {
    minHeight: 42,
    borderRadius: 14,
    marginHorizontal: 7,
    alignItems: "center",
    justifyContent: "center"
  },
  androidWheelItemActive: {
    backgroundColor: "#2563EB"
  },
  androidWheelItemText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "700"
  },
  androidWheelItemTextActive: {
    color: "#FFFFFF"
  },
  androidPickerDoneButton: {
    borderRadius: 18,
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16
  },
  androidPickerDoneText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  statusText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  }
});
