import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  AppState,
  Animated,
  Image,
  Keyboard,
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
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDateTime } from "@chaufx/ui";
import {
  cancelBooking,
  createBooking,
  createCheckoutSession,
  fetchBookingEstimate,
  fetchBookings,
  fetchMapState,
  fetchPreferredDrivers,
  fetchTripMessages,
  fetchProfile,
  login,
  requestCustomerVerificationEmail,
  requestPasswordReset,
  refreshSession,
  sendTripMessage,
  submitRating,
  syncBookingPayment,
  updateCustomerProfile,
  type PreferredDriver,
  type Session,
  type TripMessage
} from "./src/lib/api";

type Tab = "book" | "trips" | "account";
type ScheduleMode = "now" | "later";
type BookingRequestType = "NOW" | "LATER";
type Coordinate = { latitude: number; longitude: number };
type SearchField = "pickup" | "destination";
type AuthMode = "login" | "signup";
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
type RoutingDriverCard = {
  id: string;
  title: string;
  detail: string;
  distanceKm: number | null;
  status: string;
};
type GovernmentPhotoId = {
  fileName: string;
  fileUrl: string;
  mimeType?: string;
};

const customerQuickTripMessages = ["I'm ready at pickup.", "I'll be outside shortly.", "Please message when you arrive."];

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
const logo = require("./assets/chaufx-mark.png");
const paymentCompleteUrl = "ca.chaufx.customer://payment-complete";
const paymentCancelledUrl = "ca.chaufx.customer://payment-cancelled";
const TRIP_HISTORY_DAYS = 7;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const CANADA_MAP_FALLBACK: Coordinate = { latitude: 56.1304, longitude: -106.3468 };
const termsUrl = "https://chaufx.ca/policies/terms-and-conditions";
const privacyPolicyUrl = "https://chaufx.ca/policies/privacy-policy";
const deleteAccountUrl = "https://chaufx.ca/delete-account";

// Mapbox must have its token before the preview map mounts; otherwise its first style load can fail.
if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

function isCustomerSession(session: any) {
  return String(session?.user?.role ?? "").toLowerCase() === "customer";
}

function canUseTripMessages(booking: any) {
  if (!booking?.assignedDriverId) {
    return false;
  }

  return ["accepted", "enroute", "active", "completed"].includes(String(booking.status).toLowerCase());
}

function canRateBooking(booking: any) {
  const bookingStatus = String(booking?.status ?? "").toLowerCase();
  const paymentStatus = String(booking?.payment?.status ?? "").toLowerCase();
  return bookingStatus === "completed" && paymentStatus === "recorded" && Boolean(booking?.assignedDriverId);
}

function getBookingRatingScore(booking: any) {
  const score = Number(booking?.rating?.score ?? 0);
  return Number.isFinite(score) && score > 0 ? score : 0;
}

function isVerifiedCustomerProfile(profile: any) {
  const customerProfile = profile?.customerProfile;
  const primaryVehicle = Array.isArray(customerProfile?.vehicles)
    ? customerProfile.vehicles.find((vehicle: any) => vehicle.isPrimary) ?? customerProfile.vehicles[0]
    : null;

  return Boolean(
    customerProfile?.dateOfBirth &&
      isEligibleCustomerAge(String(customerProfile.dateOfBirth).slice(0, 10)) &&
      customerProfile?.primaryAddress &&
      customerProfile?.emergencyContactName &&
      customerProfile?.emergencyContactPhone &&
      customerProfile?.identityDocument &&
      primaryVehicle?.make &&
      primaryVehicle?.model &&
      primaryVehicle?.plateNumber &&
      primaryVehicle?.registrationProvince &&
      customerProfile?.vehicleComplianceConfirmedAt &&
      customerProfile?.termsAcceptedAt &&
      customerProfile?.privacyPolicyAcceptedAt &&
      customerProfile?.identityVerificationConsentedAt &&
      customerProfile?.vehicleAuthorityConfirmedAt
  );
}

function isCustomerReadyToBook(profile: any) {
  const customerProfile = profile?.customerProfile;
  const primaryVehicle = Array.isArray(customerProfile?.vehicles)
    ? customerProfile.vehicles.find((vehicle: any) => vehicle.isPrimary) ?? customerProfile.vehicles[0]
    : null;

  return Boolean(
    profile?.emailVerifiedAt &&
      normalizeCanadianPhoneNumber(profile?.phone ?? "") &&
      isEligibleCustomerAge(String(customerProfile?.dateOfBirth ?? "").slice(0, 10)) &&
      customerProfile?.identityDocument &&
      primaryVehicle?.make &&
      primaryVehicle?.model &&
      primaryVehicle?.plateNumber &&
      primaryVehicle?.registrationProvince
  );
}

function formatCanadianPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const localNumber = digits.startsWith("1") ? digits.slice(1, 11) : digits.slice(0, 10);

  if (!localNumber) {
    return "";
  }
  if (localNumber.length <= 3) {
    return `+1 (${localNumber}`;
  }
  if (localNumber.length <= 6) {
    return `+1 (${localNumber.slice(0, 3)}) ${localNumber.slice(3)}`;
  }
  return `+1 (${localNumber.slice(0, 3)}) ${localNumber.slice(3, 6)}-${localNumber.slice(6)}`;
}

function formatBookingVehicleDetails(vehicle: any) {
  const details = [vehicle?.make, vehicle?.model, vehicle?.plateNumber]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return details.join(" ");
}

function normalizeCanadianPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const localNumber = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  return /^[2-9]\d{2}[2-9]\d{6}$/.test(localNumber) ? `+1${localNumber}` : null;
}

function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateOfBirthDisplay(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return value;
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${match[1]}-${months[Number(match[2]) - 1]}-${match[3]}`;
}

function isEligibleCustomerAge(value: string) {
  if (!value) {
    return false;
  }

  const dateOfBirth = new Date(`${value}T12:00:00`);
  if (Number.isNaN(dateOfBirth.getTime())) {
    return false;
  }

  const latestEligibleBirthDate = getLatestEligibleBirthDate();
  latestEligibleBirthDate.setHours(0, 0, 0, 0);
  return dateOfBirth <= latestEligibleBirthDate;
}

function getLatestEligibleBirthDate() {
  const latestEligibleBirthDate = new Date();
  latestEligibleBirthDate.setFullYear(latestEligibleBirthDate.getFullYear() - 18);
  return latestEligibleBirthDate;
}

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

function formatCoordinateLabel(coords: Coordinate) {
  return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
}

async function reverseGeocodeCoordinate(coords: Coordinate) {
  try {
    const reverse = await Location.reverseGeocodeAsync(coords);
    const first = reverse[0];

    if (first) {
      const label = [first.name, first.street, first.city, first.region].filter(Boolean).join(", ");
      if (label.trim()) {
        return label;
      }
    }
  } catch {
    // Fall through to Mapbox or coordinate fallback below.
  }

  if (mapboxToken) {
    try {
      const params = new URLSearchParams({
        access_token: mapboxToken,
        limit: "1",
        language: "en"
      });
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.longitude},${coords.latitude}.json?${params.toString()}`
      );
      const payload = await response.json();
      const feature = Array.isArray(payload?.features) ? payload.features[0] : null;
      const label = String(feature?.place_name ?? feature?.text ?? "").trim();

      if (label) {
        return label;
      }
    } catch {
      // Keep the coordinate fallback below.
    }
  }

  return null;
}

async function resolveCurrentCoordinate() {
  const current =
    (await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000,
      requiredAccuracy: 250
    }).catch(() => null)) ??
    (await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true
    }).catch(() => null));

  if (!current) {
    return null;
  }

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude
  } satisfies Coordinate;
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

function formatDispatchStatus(value?: string) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "accepted") {
    return "Driver reviewing now";
  }
  if (normalized === "declined") {
    return "Driver passed";
  }
  if (normalized === "expired") {
    return "Timed out";
  }
  return "Routing now";
}

function buildRoutingDriverCards(booking: any): RoutingDriverCard[] {
  const dispatches = Array.isArray(booking?.dispatches) ? booking.dispatches : [];

  return dispatches
    .filter((dispatch: any) => ["pending", "accepted"].includes(String(dispatch.status ?? "").toLowerCase()))
    .slice(0, 5)
    .map((dispatch: any, index: number) => {
      const distance = Number(dispatch.distanceKm);
      const formattedDistance =
        Number.isFinite(distance) && distance > 0
          ? `${distance < 10 ? distance.toFixed(1) : distance.toFixed(0)} km away`
          : "Near your pickup";

      return {
        id: String(dispatch.id ?? `${booking.id}-dispatch-${index}`),
        title: index === 0 ? "Closest driver first" : `Nearby driver ${index + 1}`,
        detail: formattedDistance,
        distanceKm: Number.isFinite(distance) ? distance : null,
        status: formatDispatchStatus(dispatch.status)
      };
    });
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

function buildCameraProps(points: Coordinate[], fallback: Coordinate, defaultZoomLevel = 12.8) {
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
    zoomLevel: defaultZoomLevel,
    centerCoordinate: [fallback.longitude, fallback.latitude] as [number, number],
    animationMode: "easeTo" as const,
    animationDuration: 600
  };
}

function MapSurface({
  currentLocation,
  pickup,
  destination,
  preferCanadaFallback = false,
  interactive = false,
  onPress
}: {
  currentLocation: Coordinate | null;
  pickup: Coordinate | null;
  destination: Coordinate | null;
  preferCanadaFallback?: boolean;
  interactive?: boolean;
  onPress?: () => void;
}) {
  const primaryPoint = pickup ?? (preferCanadaFallback ? null : currentLocation);
  const center = primaryPoint ?? CANADA_MAP_FALLBACK;
  const cameraPoints = [primaryPoint, destination].filter(Boolean) as Coordinate[];
  const cameraZoomLevel = pickup ? 15.1 : primaryPoint || destination ? 13.1 : 3.2;
  const cameraProps = buildCameraProps(cameraPoints, center, cameraZoomLevel);
  const cameraKey = [
    pickup ? `pickup:${pickup.latitude.toFixed(6)},${pickup.longitude.toFixed(6)}` : "pickup:none",
    destination ? `destination:${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}` : "destination:none",
    preferCanadaFallback ? "fallback:canada" : "fallback:current"
  ].join("|");
  const [routeShape, setRouteShape] = useState<any>(null);
  const [mapLayoutVersion, setMapLayoutVersion] = useState(0);
  const hasMeasuredMapRef = useRef(false);

  function handleMapLayout(event: { nativeEvent: { layout: { width: number; height: number } } }) {
    const { width, height } = event.nativeEvent.layout;
    if (hasMeasuredMapRef.current || width <= 0 || height <= 0) {
      return;
    }

    // iOS can mount Mapbox before a compact preview has dimensions. Remount once sized.
    hasMeasuredMapRef.current = true;
    requestAnimationFrame(() => setMapLayoutVersion(1));
  }

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
        <Text style={styles.mapFallbackTitle}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.map} onLayout={handleMapLayout}>
      <Mapbox.MapView
        key={`${cameraKey}|layout:${mapLayoutVersion}`}
        style={styles.mapFill}
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
        <Mapbox.Camera key={cameraKey} {...cameraProps} />
        {currentLocation && !pickup ? (
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
    </View>
  );
}

export default function App() {
  const insets = useSafeAreaInsets();
  const defaults = getDefaultScheduledTime();
  const [session, setSession] = useState<Session | null>(null);
  const sessionIssuedAtRef = useRef(Date.now());
  const sessionRenewalInFlightRef = useRef(false);
  const lastSessionActivityAtRef = useRef(Date.now());
  const [tab, setTab] = useState<Tab>("book");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [passwordResetBusy, setPasswordResetBusy] = useState(false);
  const [customerProfileSaving, setCustomerProfileSaving] = useState(false);
  const [showDateOfBirthPicker, setShowDateOfBirthPicker] = useState(false);
  const [dateOfBirthPickerValue, setDateOfBirthPickerValue] = useState(new Date(1990, 0, 1));
  const [governmentPhotoId, setGovernmentPhotoId] = useState<GovernmentPhotoId | null>(null);
  const [customerAccountForm, setCustomerAccountForm] = useState({
    phone: "",
    dateOfBirth: "",
    primaryAddress: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    vehicleMake: "",
    vehicleModel: "",
    licencePlate: "",
    registrationProvince: "",
    vehicleComplianceConfirmed: false,
    termsAccepted: false,
    privacyPolicyAccepted: false,
    identityVerificationConsented: false,
    vehicleAuthorityConfirmed: false
  });
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [mapState, setMapState] = useState<any>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [preferredDrivers, setPreferredDrivers] = useState<PreferredDriver[]>([]);
  const [preferredDriversLoading, setPreferredDriversLoading] = useState(false);
  const [selectedPreferredDriverId, setSelectedPreferredDriverId] = useState<string | null>(null);
  const [tripMessages, setTripMessages] = useState<TripMessage[]>([]);
  const [tripMessageDraft, setTripMessageDraft] = useState("");
  const [tripMessagesBusy, setTripMessagesBusy] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("now");
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [activeSearchField, setActiveSearchField] = useState<SearchField | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showScheduleDatePicker, setShowScheduleDatePicker] = useState(false);
  const [showScheduleTimePicker, setShowScheduleTimePicker] = useState(false);
  const [fullScreenMapVisible, setFullScreenMapVisible] = useState(false);
  const [activeRoutingCardIndex, setActiveRoutingCardIndex] = useState(0);
  const [androidLocationFallbackActive, setAndroidLocationFallbackActive] = useState(false);
  const [pickupLockedVisible, setPickupLockedVisible] = useState(false);
  const pickupLockedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupManuallyEditedRef = useRef(false);
  const authScrollRef = useRef<ScrollView>(null);
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
    vehicleDetails: "",
    zoneCode: "WPG-CENTRAL"
  });
  const isAndroidLoginMode = Platform.OS === "android";

  function recordSessionActivity() {
    if (session?.accessToken) {
      lastSessionActivityAtRef.current = Date.now();
    }
  }

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const expireIfInactive = () => {
      if (Date.now() - lastSessionActivityAtRef.current >= SESSION_IDLE_TIMEOUT_MS) {
        logout();
        setStatus("Session expired. Please sign in again.");
      }
    };

    const interval = setInterval(expireIfInactive, 60 * 1000);
    const appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        expireIfInactive();
      }
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.refreshToken) {
      return;
    }

    sessionIssuedAtRef.current = Date.now();
    let active = true;

    const renew = async () => {
      if (sessionRenewalInFlightRef.current) {
        return;
      }

      sessionRenewalInFlightRef.current = true;
      try {
        const nextSession = await refreshSession(session.refreshToken);
        if (active && isCustomerSession(nextSession)) {
          setSession(nextSession);
        }
      } catch {
        if (active) {
          logout();
          setStatus("Session expired. Please sign in again.");
        }
      } finally {
        sessionRenewalInFlightRef.current = false;
      }
    };

    const interval = setInterval(() => void renew(), 14 * 60 * 1000);
    const appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && Date.now() - sessionIssuedAtRef.current >= 12 * 60 * 1000) {
        void renew();
      }
    });

    return () => {
      active = false;
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [session?.refreshToken]);
  const isVerifiedCustomer = isVerifiedCustomerProfile(profile);
  const isCustomerReadyForBooking = isCustomerReadyToBook(profile);

  function keepAuthActionVisible() {
    setTimeout(() => {
      authScrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === "ios" ? 300 : 180);
  }

  useEffect(() => {
    if (session) {
      return;
    }

    const showSubscription = Keyboard.addListener("keyboardDidShow", keepAuthActionVisible);
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      authScrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [session]);

  async function openAccountPolicy(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setStatus("Unable to open this policy right now.");
    }
  }

  function requestAccountDeletion() {
    Alert.alert(
      "Delete account",
      "Continue to submit your account deletion request.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            WebBrowser.openBrowserAsync(deleteAccountUrl).catch(() => {
              setStatus("Unable to open account deletion right now.");
            });
          }
        }
      ]
    );
  }

  function showBookingVerificationRequired() {
    const openAccount = () => {
      setTab("account");
      setStatus("");
    };

    Alert.alert(
      "Verification required",
      "You cannot book until you are verified.",
      [{ text: "OK", onPress: openAccount }],
      { cancelable: true, onDismiss: openAccount }
    );
  }

  useEffect(() => {
    return () => {
      if (pickupLockedTimeoutRef.current) {
        clearTimeout(pickupLockedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    refreshDashboard();
  }, [session]);

  useEffect(() => {
    const customerProfile = profile?.customerProfile;
    if (!profile) {
      return;
    }

    const primaryVehicle = Array.isArray(customerProfile?.vehicles)
      ? customerProfile.vehicles.find((vehicle: any) => vehicle.isPrimary) ?? customerProfile.vehicles[0]
      : null;
    const bookingVehicleDetails = formatBookingVehicleDetails(primaryVehicle);

    if (bookingVehicleDetails) {
      setForm((currentForm) => ({ ...currentForm, vehicleDetails: bookingVehicleDetails }));
    }

    setCustomerAccountForm({
      phone: formatCanadianPhoneNumber(profile.phone ?? ""),
      dateOfBirth: customerProfile?.dateOfBirth ? String(customerProfile.dateOfBirth).slice(0, 10) : "",
      primaryAddress: customerProfile?.primaryAddress ?? "",
      emergencyContactName: customerProfile?.emergencyContactName ?? "",
      emergencyContactPhone: formatCanadianPhoneNumber(customerProfile?.emergencyContactPhone ?? ""),
      vehicleMake: primaryVehicle?.make ?? "",
      vehicleModel: primaryVehicle?.model ?? "",
      licencePlate: primaryVehicle?.plateNumber ?? "",
      registrationProvince: primaryVehicle?.registrationProvince ?? customerProfile?.vehicleRegistrationProvince ?? "",
      vehicleComplianceConfirmed: Boolean(customerProfile?.vehicleComplianceConfirmedAt),
      termsAccepted: Boolean(customerProfile?.termsAcceptedAt),
      privacyPolicyAccepted: Boolean(customerProfile?.privacyPolicyAcceptedAt),
      identityVerificationConsented: Boolean(customerProfile?.identityVerificationConsentedAt),
      vehicleAuthorityConfirmed: Boolean(customerProfile?.vehicleAuthorityConfirmedAt)
    });
  }, [profile]);

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
          setStatus("Payment recorded.");
        } catch {
          setStatus("Payment received.");
        }
      } else if (url.includes("payment-cancelled")) {
        setStatus("Payment cancelled.");
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

    const estimatePickupLat = Number(form.pickupLat);
    const estimatePickupLng = Number(form.pickupLng);

    const scheduledStartAt =
      scheduleMode === "now" ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : toIso(form.scheduledDate, form.scheduledTime);

    fetchBookingEstimate(session.accessToken, {
      scheduledStartAt,
      expectedDurationMinutes: clampDurationHours(Number(form.durationHours) || 0) * 60,
      zoneCode: form.zoneCode,
      pickupLocation: form.pickupLocation.trim() || undefined,
      destinationLocation: form.destinationLocation.trim() || undefined,
      pickupLat: Number.isFinite(estimatePickupLat) ? estimatePickupLat : undefined,
      pickupLng: Number.isFinite(estimatePickupLng) ? estimatePickupLng : undefined
    })
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, [
    form.destinationLocation,
    form.durationHours,
    form.pickupLat,
    form.pickupLng,
    form.pickupLocation,
    form.scheduledDate,
    form.scheduledTime,
    form.zoneCode,
    scheduleMode,
    session
  ]);

  useEffect(() => {
    if (!session?.accessToken) {
      setPreferredDrivers([]);
      setSelectedPreferredDriverId(null);
      return;
    }

    const pickupLat = Number(form.pickupLat);
    const pickupLng = Number(form.pickupLng);
    if (!form.pickupLocation.trim() || !Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) {
      setPreferredDrivers([]);
      setSelectedPreferredDriverId(null);
      return;
    }

    let cancelled = false;
    setPreferredDriversLoading(true);
    const timeout = setTimeout(() => {
      const scheduledStartAt =
        scheduleMode === "now" ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : toIso(form.scheduledDate, form.scheduledTime);

      fetchPreferredDrivers(session.accessToken, {
        requestType: scheduleMode === "now" ? "NOW" : "LATER",
        pickupLocation: form.pickupLocation.trim(),
        pickupLat,
        pickupLng,
        scheduledStartAt,
        expectedDurationMinutes: clampDurationHours(Number(form.durationHours) || 0) * 60,
        zoneCode: form.zoneCode
      })
        .then((drivers) => {
          if (cancelled) return;
          setPreferredDrivers(drivers);
          setSelectedPreferredDriverId((selectedId) => (drivers.some((driver) => driver.id === selectedId) ? selectedId : null));
        })
        .catch(() => {
          if (!cancelled) {
            setPreferredDrivers([]);
            setSelectedPreferredDriverId(null);
          }
        })
        .finally(() => {
          if (!cancelled) setPreferredDriversLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    form.durationHours,
    form.pickupLat,
    form.pickupLng,
    form.pickupLocation,
    form.scheduledDate,
    form.scheduledTime,
    form.zoneCode,
    scheduleMode,
    session?.accessToken
  ]);

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

  useEffect(() => {
    if (!session?.accessToken || !pickupManuallyEditedRef.current) {
      return;
    }

    const query = form.pickupLocation.trim();
    if (query.length < 3) {
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      searchPlaces(query, currentLocation)
        .then((results) => {
          if (cancelled || !results.length) {
            return;
          }

          const bestMatch = results[0];
          setForm((currentForm) => {
            if (currentForm.pickupLocation.trim() !== query) {
              return currentForm;
            }

            return {
              ...currentForm,
              pickupLat: String(bestMatch.latitude),
              pickupLng: String(bestMatch.longitude)
            };
          });
          setAndroidLocationFallbackActive(false);
          triggerPickupLocked();
        })
        .catch(() => undefined);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [currentLocation, form.pickupLocation, session?.accessToken]);

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
  const routingDriverCards = useMemo(
    () =>
      activeBooking &&
      activeBooking.requestType === "NOW" &&
      String(activeBooking.status).toLowerCase() === "pending"
        ? buildRoutingDriverCards(activeBooking)
        : [],
    [activeBooking]
  );

  useEffect(() => {
    setActiveRoutingCardIndex(0);
  }, [routingDriverCards.length, activeBooking?.id]);

  useEffect(() => {
    if (routingDriverCards.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setActiveRoutingCardIndex((current) => (current + 1) % routingDriverCards.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [routingDriverCards.length]);

  useEffect(() => {
    if (!session?.accessToken || !activeBooking) {
      return;
    }

    const activeStatus = String(activeBooking.status).toLowerCase();
    if (!["awaiting_payment", "pending", "accepted"].includes(activeStatus)) {
      return;
    }

    const interval = setInterval(() => {
      refreshDashboard().catch(() => undefined);
    }, 15000);

    return () => clearInterval(interval);
  }, [activeBooking?.id, activeBooking?.status, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || !activeBooking || !canUseTripMessages(activeBooking)) {
      setTripMessages([]);
      setTripMessageDraft("");
      return;
    }

    let active = true;

    const loadMessages = async () => {
      try {
        const items = await fetchTripMessages(session.accessToken, activeBooking.id);
        if (active) {
          setTripMessages(items);
        }
      } catch {
        if (active) {
          setTripMessages([]);
        }
      }
    };

    void loadMessages();
    const interval = setInterval(() => {
      void loadMessages();
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeBooking?.id, activeBooking?.status, session?.accessToken]);

  async function handleSendTripMessage(bodyOverride?: string) {
    if (!session?.accessToken || !activeBooking || !canUseTripMessages(activeBooking)) {
      return;
    }

    const body = (bodyOverride ?? tripMessageDraft).trim();
    if (!body) {
      return;
    }

    setTripMessagesBusy(true);
    try {
      const message = await sendTripMessage(session.accessToken, activeBooking.id, body);
      setTripMessages((current) => [...current, message]);
      setTripMessageDraft("");
      setStatus("Message sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setTripMessagesBusy(false);
    }
  }

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
      if (Platform.OS === "android") {
        await Location.enableNetworkProviderAsync().catch(() => undefined);
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!servicesEnabled) {
        setStatus("Turn on device location services to autofill your pickup address.");
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setStatus("Location permission is needed to autofill your pickup address.");
        return;
      }

      const coords = await resolveCurrentCoordinate();
      if (!coords) {
        setStatus("Location not available.");
        if (Platform.OS === "android") {
          setAndroidLocationFallbackActive(true);
        }
        return;
      }
      setCurrentLocation(coords);

      setForm((currentForm) =>
        pickupManuallyEditedRef.current
          ? currentForm
          : {
              ...currentForm,
              pickupLat: String(coords.latitude),
              pickupLng: String(coords.longitude)
            }
      );

      if (pickupManuallyEditedRef.current) {
        return;
      }

      const label = await reverseGeocodeCoordinate(coords);
      if (!label) {
        if (Platform.OS === "android") {
          setAndroidLocationFallbackActive(true);
          setStatus("Pickup address not detected.");
          return;
        }

        setForm((currentForm) => ({
          ...currentForm,
          pickupLocation: formatCoordinateLabel(coords),
          pickupLat: String(coords.latitude),
          pickupLng: String(coords.longitude)
        }));
        return;
      }

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
      setAndroidLocationFallbackActive(false);
    } catch {
      setStatus("Location not available.");
      if (Platform.OS === "android") {
        setAndroidLocationFallbackActive(true);
      }
    }
  }

  async function handleLogin() {
    setBusy(true);
    setStatus("");
    try {
      const nextSession = await login(loginEmail.trim(), loginPassword);
      if (!isCustomerSession(nextSession)) {
        setSession(null);
        setStatus("Use a customer account to sign in.");
        return;
      }
      lastSessionActivityAtRef.current = Date.now();
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

  async function handleRegister() {
    const fullName = signupFullName.trim();
    const email = signupEmail.trim();

    if (!fullName || !email || !signupPassword) {
      setStatus("Enter your legal name, email, and password.");
      return;
    }

    if (signupPassword.length < 8) {
      setStatus("Password must be at least 8 characters.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const result = await requestCustomerVerificationEmail({
        fullName,
        email,
        password: signupPassword
      });
      setLoginEmail(email);
      setLoginPassword("");
      setSignupFullName("");
      setSignupEmail(email);
      setSignupPassword("");
      setSignupConfirmPassword("");
      setShowSignupPassword(false);
      setShowSignupConfirmPassword(false);
      setAuthMode("login");
      setStatus(result.message || "A verification link has been sent to your email address.");
      Alert.alert(
        "Verify your email",
        result.previewUrl
          ? `A verification link has been sent to your email address.\n\nPreview: ${result.previewUrl}`
          : "A verification link has been sent to your email address. Please verify your email, then sign in."
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setBusy(false);
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

      const result = await WebBrowser.openAuthSessionAsync(checkout.checkoutUrl, paymentCompleteUrl);

      if (result.type === "success") {
        try {
          await syncBookingPayment(session.accessToken, bookingId);
          setStatus("Payment recorded.");
        } catch {
          setStatus("Payment received.");
        }
        setTab("trips");
        await refreshDashboard();
      } else if (result.type === "cancel" || result.type === "dismiss") {
        setStatus("Payment cancelled.");
      }
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

    if (!isCustomerReadyForBooking) {
      showBookingVerificationRequired();
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
        preferredDriverId: selectedPreferredDriverId ?? undefined,
        zoneCode: form.zoneCode
      });

      const bookingId = result?.booking?.id ?? result?.id;
      if (!bookingId) {
        throw new Error("Booking was created, but checkout could not be started. Please refresh and try again.");
      }

      if (result?.reusedPendingBooking) {
        setStatus("An identical booking is already awaiting payment.");
        setTab("trips");
        await refreshDashboard();
        return;
      }

      setStatus("Booking created. Complete payment to start driver matching.");
      setTab("trips");
      await refreshDashboard();
      await openCheckoutForBooking(bookingId, false);
    } catch (error) {
      if ((error as { code?: string })?.code === "CUSTOMER_VERIFICATION_REQUIRED") {
        showBookingVerificationRequired();
      } else {
        setStatus(error instanceof Error ? error.message : "Unable to submit your booking.");
      }
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

  async function handlePickGovernmentPhotoId() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      if (file.size && file.size > 7 * 1024 * 1024) {
        setStatus("Government photo ID files must be 7 MB or smaller.");
        return;
      }

      const mimeType = file.mimeType ?? "application/octet-stream";
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      setGovernmentPhotoId({
        fileName: file.name,
        fileUrl: `data:${mimeType};base64,${base64}`,
        mimeType
      });
      setStatus("Government photo ID selected. Save account details to upload it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to select government photo ID.");
    }
  }

  async function handleSaveCustomerProfile() {
    if (!session?.accessToken) {
      return;
    }

    const emergencyPhone = normalizeCanadianPhoneNumber(customerAccountForm.emergencyContactPhone);
    if (!emergencyPhone) {
      setStatus("Enter a valid Canadian emergency phone number.");
      return;
    }

    const phone = normalizeCanadianPhoneNumber(customerAccountForm.phone);
    if (!phone) {
      setStatus("Enter a valid Canadian mobile phone number.");
      return;
    }

    const vehicleValues = [
      customerAccountForm.vehicleMake.trim(),
      customerAccountForm.vehicleModel.trim(),
      customerAccountForm.licencePlate.trim(),
      customerAccountForm.registrationProvince.trim()
    ];
    const hasCompleteVehicleDetails = vehicleValues.every(Boolean);
    if (!customerAccountForm.dateOfBirth || !customerAccountForm.primaryAddress.trim() || !customerAccountForm.emergencyContactName.trim()) {
      setStatus("Complete all required personal and emergency contact details.");
      return;
    }

    if (!isEligibleCustomerAge(customerAccountForm.dateOfBirth)) {
      setStatus("You must be 18 or older to use ChaufX.");
      return;
    }

    if (!hasCompleteVehicleDetails) {
      setStatus("Complete the vehicle make, model, licence plate, and province of registration.");
      return;
    }

    if (!governmentPhotoId && !profile?.customerProfile?.identityDocument) {
      setStatus("Add a government issued photo ID.");
      return;
    }

    if (
      !customerAccountForm.vehicleComplianceConfirmed ||
      !customerAccountForm.termsAccepted ||
      !customerAccountForm.privacyPolicyAccepted ||
      !customerAccountForm.identityVerificationConsented ||
      !customerAccountForm.vehicleAuthorityConfirmed
    ) {
      setStatus("Confirm all required acknowledgements.");
      return;
    }

    setCustomerProfileSaving(true);
    try {
      const updatedCustomerProfile = await updateCustomerProfile(session.accessToken, {
        phone,
        ...(customerAccountForm.dateOfBirth ? { dateOfBirth: customerAccountForm.dateOfBirth } : {}),
        ...(customerAccountForm.primaryAddress.trim() ? { primaryAddress: customerAccountForm.primaryAddress.trim() } : {}),
        ...(customerAccountForm.emergencyContactName.trim()
          ? { emergencyContactName: customerAccountForm.emergencyContactName.trim() }
          : {}),
        ...(emergencyPhone ? { emergencyContactPhone: emergencyPhone } : {}),
        ...(hasCompleteVehicleDetails
          ? {
              vehicle: {
                make: customerAccountForm.vehicleMake.trim(),
                model: customerAccountForm.vehicleModel.trim(),
                plateNumber: customerAccountForm.licencePlate.trim(),
                registrationProvince: customerAccountForm.registrationProvince.trim()
              }
            }
          : {}),
        vehicleComplianceConfirmed: customerAccountForm.vehicleComplianceConfirmed,
        termsAccepted: customerAccountForm.termsAccepted,
        privacyPolicyAccepted: customerAccountForm.privacyPolicyAccepted,
        identityVerificationConsented: customerAccountForm.identityVerificationConsented,
        vehicleAuthorityConfirmed: customerAccountForm.vehicleAuthorityConfirmed,
        ...(governmentPhotoId ? { governmentPhotoId } : {})
      });

      setProfile((currentProfile: any) =>
        currentProfile
          ? {
              ...currentProfile,
              phone,
              customerProfile: updatedCustomerProfile
            }
          : currentProfile
      );
      setGovernmentPhotoId(null);
      setStatus("Account details saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save account details.");
    } finally {
      setCustomerProfileSaving(false);
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

  async function handleSubmitRating(bookingId: string) {
    if (!session?.accessToken) {
      return;
    }

    setRatingBusy(true);
    try {
      await submitRating(session.accessToken, bookingId, ratingScore, "");
      setStatus("Rating submitted.");
      setRatingBookingId(null);
      await refreshDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit rating.");
    } finally {
      setRatingBusy(false);
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

  function renderRatingBlock(booking: any) {
    if (!canRateBooking(booking)) {
      return null;
    }

    const existingRating = getBookingRatingScore(booking);
    if (existingRating > 0) {
      return (
        <View style={styles.ratingBlock}>
          <Text style={styles.ratingLabel}>Driver rating</Text>
          <Text style={styles.ratingSummary}>Rated {existingRating}/5</Text>
        </View>
      );
    }

    const isOpen = ratingBookingId === booking.id;

    return (
      <View style={styles.ratingBlock}>
        {!isOpen ? (
          <Pressable
            style={[styles.ratingActionButton, ratingBusy && styles.buttonDisabled]}
            disabled={ratingBusy}
            onPress={() => {
              setRatingBookingId(booking.id);
              setRatingScore(5);
            }}
          >
            <Text style={styles.ratingActionButtonText}>Rate driver</Text>
          </Pressable>
        ) : (
          <View style={styles.ratingComposer}>
            <Text style={styles.ratingLabel}>Rate driver</Text>
            <View style={styles.ratingStarsRow}>
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= ratingScore;
                return (
                  <Pressable
                    key={value}
                    style={styles.ratingStarButton}
                    disabled={ratingBusy}
                    onPress={() => setRatingScore(value)}
                  >
                    <Text style={[styles.ratingStarText, active && styles.ratingStarTextActive]}>{active ? "★" : "☆"}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.ratingActionsRow}>
              <Pressable
                style={[styles.ratingSubmitButton, ratingBusy && styles.buttonDisabled]}
                disabled={ratingBusy}
                onPress={() => handleSubmitRating(booking.id)}
              >
                <Text style={styles.ratingSubmitButtonText}>{ratingBusy ? "Submitting..." : "Submit rating"}</Text>
              </Pressable>
              <Pressable
                style={[styles.ratingCancelButton, ratingBusy && styles.buttonDisabled]}
                disabled={ratingBusy}
                onPress={() => setRatingBookingId(null)}
              >
                <Text style={styles.ratingCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  function renderRoutingStatus(booking: any) {
    if (booking.requestType !== "NOW" || String(booking.status).toLowerCase() !== "pending") {
      return null;
    }

    const currentCard = routingDriverCards[activeRoutingCardIndex] ?? null;

    return (
      <View style={styles.routingPanel}>
        <Text style={styles.routingTitle}>Matching drivers</Text>
        {currentCard ? (
          <View style={styles.routingCard}>
            <Text style={styles.routingCardTitle}>{currentCard.title}</Text>
            <Text style={styles.routingCardDistance}>{currentCard.detail}</Text>
            <Text style={styles.routingCardStatus}>{currentCard.status}</Text>
          </View>
        ) : (
          <View style={styles.routingCard}>
            <Text style={styles.routingCardTitle}>Matching</Text>
          </View>
        )}
        {routingDriverCards.length > 1 ? (
          <View style={styles.routingDots}>
            {routingDriverCards.map((item, index) => (
              <View
                key={item.id}
                style={[styles.routingDot, index === activeRoutingCardIndex && styles.routingDotActive]}
              />
            ))}
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

  function triggerPickupLocked() {
    setPickupLockedVisible(true);
    if (pickupLockedTimeoutRef.current) {
      clearTimeout(pickupLockedTimeoutRef.current);
    }
    pickupLockedTimeoutRef.current = setTimeout(() => {
      setPickupLockedVisible(false);
      pickupLockedTimeoutRef.current = null;
    }, 2200);
  }

  function applySuggestion(field: SearchField, suggestion: PlaceSuggestion) {
    if (field === "pickup") {
      pickupManuallyEditedRef.current = true;
      setAndroidLocationFallbackActive(false);
      triggerPickupLocked();
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
        <Text style={[styles.loginTitle, isAndroidLoginMode ? styles.loginTitleCompact : null]}>
          {authMode === "login" ? "Welcome" : "Create account"}
        </Text>

        <View style={[styles.loginCard, isAndroidLoginMode ? styles.loginCardCompact : null]}>
          {authMode === "signup" ? (
            <>
              <TextInput
                placeholder="Full legal name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                style={styles.input}
                value={signupFullName}
                onChangeText={setSignupFullName}
                onFocus={keepAuthActionVisible}
                showSoftInputOnFocus
              />
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
                value={signupEmail}
                onChangeText={setSignupEmail}
                onFocus={keepAuthActionVisible}
                showSoftInputOnFocus
              />
              <View style={styles.passwordFieldRow}>
                <TextInput
                  placeholder="Create a password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showSignupPassword}
                  style={styles.passwordInput}
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  onFocus={keepAuthActionVisible}
                  showSoftInputOnFocus
                />
                <Pressable onPress={() => setShowSignupPassword((current) => !current)}>
                  <Text style={styles.passwordToggleText}>{showSignupPassword ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>
              <View style={styles.passwordFieldRow}>
                <TextInput
                  placeholder="Confirm password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showSignupConfirmPassword}
                  style={styles.passwordInput}
                  value={signupConfirmPassword}
                  onChangeText={setSignupConfirmPassword}
                  onFocus={keepAuthActionVisible}
                  showSoftInputOnFocus
                />
                <Pressable onPress={() => setShowSignupConfirmPassword((current) => !current)}>
                  <Text style={styles.passwordToggleText}>{showSignupConfirmPassword ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>
              <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} disabled={busy} onPress={handleRegister}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create account</Text>}
              </Pressable>
              <Pressable
                style={styles.authModeLink}
                onPress={() => {
                  setAuthMode("login");
                  setStatus("");
                }}
              >
                <Text style={styles.linkText}>Already have an account? Sign in</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
                value={loginEmail}
                onChangeText={setLoginEmail}
                onFocus={keepAuthActionVisible}
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
                  onFocus={keepAuthActionVisible}
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
              <Pressable
                style={styles.authModeLink}
                onPress={() => {
                  setAuthMode("signup");
                  setStatus("");
                  setSignupEmail(loginEmail.trim());
                }}
              >
                <Text style={styles.linkText}>Need account? Create one</Text>
              </Pressable>
            </>
          )}
        </View>

        {status ? <Text style={styles.statusText}>{status}</Text> : null}
      </View>
    );

    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            ref={authScrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.contentGrow,
              styles.loginWrap,
              Platform.OS === "android" ? styles.androidLoginShell : null,
              {
                paddingTop: Math.max(insets.top, 18) + (Platform.OS === "android" ? 12 : 20),
                paddingBottom: Math.max(insets.bottom, 24) + (Platform.OS === "android" ? 56 : 140)
              }
            ]}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            scrollEnabled
          >
            {loginPanel}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} onTouchStart={recordSessionActivity}>
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
            <Text style={styles.headerTitle}>
              <Text style={styles.headerGreeting}>Hello </Text>
              {profile?.fullName?.split(" ")[0] ?? "there"}
            </Text>
          </View>
          <Pressable style={styles.ghostButton} onPress={refreshDashboard}>
            <Text style={styles.ghostButtonText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>

        <View style={styles.mapCard} pointerEvents="box-none">
          <View style={styles.mapFrame} pointerEvents="none">
            <MapSurface
              currentLocation={currentLocation}
              pickup={pickupCoordinate}
              destination={destinationCoordinate}
              preferCanadaFallback={androidLocationFallbackActive && !pickupCoordinate}
            />
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
                    setPickupLockedVisible(false);
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
              {pickupLockedVisible && pickupCoordinate ? (
                <View style={styles.pickupLockedCard}>
                  <View style={styles.pickupLockedBadge}>
                    <View style={styles.pickupLockedDot} />
                    <Text style={styles.pickupLockedBadgeText}>Pickup locked</Text>
                  </View>
                </View>
              ) : null}
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
              {Platform.OS === "android" && androidLocationFallbackActive ? (
                <View style={styles.locationHintCard}>
                  <Text style={styles.locationHintTitle}>Turn on location</Text>
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

            {preferredDrivers.length > 0 || preferredDriversLoading ? (
              <View style={styles.preferredDriversCard}>
                <View style={styles.preferredDriversHeader}>
                  <Text style={styles.preferredDriversTitle}>Drive with again</Text>
                  {preferredDriversLoading ? <ActivityIndicator size="small" color="#2563EB" /> : null}
                </View>
                <Pressable
                  style={[styles.noPreferenceButton, !selectedPreferredDriverId && styles.preferredDriverSelected]}
                  onPress={() => setSelectedPreferredDriverId(null)}
                >
                  <Text style={[styles.noPreferenceText, !selectedPreferredDriverId && styles.preferredDriverSelectedText]}>No preference</Text>
                </Pressable>
                {preferredDrivers.map((driver) => {
                  const selected = driver.id === selectedPreferredDriverId;
                  const rating = driver.averageRating ? driver.averageRating.toFixed(1) : String(driver.customerRating);
                  return (
                    <Pressable
                      key={driver.id}
                      style={[styles.preferredDriverRow, selected && styles.preferredDriverSelected]}
                      onPress={() => setSelectedPreferredDriverId(driver.id)}
                    >
                      <View style={styles.preferredDriverAvatar}>
                        <Text style={styles.preferredDriverAvatarText}>{driver.displayName.slice(0, 1)}</Text>
                      </View>
                      <View style={styles.preferredDriverCopy}>
                        <Text style={[styles.preferredDriverName, selected && styles.preferredDriverSelectedText]}>{driver.displayName}</Text>
                        <Text style={[styles.preferredDriverMeta, selected && styles.preferredDriverSelectedMeta]}>
                          {`★ ${rating} · Your rating ${driver.customerRating}/5 · ${driver.completedTripsWithYou} trip${driver.completedTripsWithYou === 1 ? "" : "s"}`}
                        </Text>
                      </View>
                      <View style={[styles.preferredDriverCheck, selected && styles.preferredDriverCheckSelected]}>
                        {selected ? <Text style={styles.preferredDriverCheckText}>✓</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

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
                  {estimate?.membershipApplied ? (
                    <Text style={styles.estimateMeta}>
                      {Number(estimate.membershipSavings) > 0
                        ? `Membership savings: $${Number(estimate.membershipSavings).toFixed(2)} CAD`
                        : `${String(estimate.pricingMembershipTier ?? "Member").toLowerCase().replace(/(^|_)([a-z])/g, (_match: string, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)} member rate: $${Number(estimate.flatFee).toFixed(2)}/hour`}
                    </Text>
                  ) : null}
                </View>
              </View>
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
                      <Text style={styles.linkText}>{String(activeBooking.status).toLowerCase() === "awaiting_payment" ? "Cancel payment" : "Cancel booking"}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.bookingTitle}>{activeBooking.pickupLocation}</Text>
                <Text style={styles.bookingCopy}>{activeBooking.destinationLocation}</Text>
                <Text style={styles.bookingMeta}>{formatDateTime(activeBooking.scheduledStartAt)}</Text>
                {renderRoutingStatus(activeBooking)}
                {renderPaymentBlock(activeBooking)}
                {canUseTripMessages(activeBooking) ? (
                  <View style={styles.chatCard}>
                    <Text style={styles.chatTitle}>Messages</Text>
                    <View style={styles.chatQuickReplyRow}>
                      {customerQuickTripMessages.map((message) => (
                        <Pressable
                          key={message}
                          style={[styles.chatQuickReplyChip, tripMessagesBusy && styles.buttonDisabled]}
                          disabled={tripMessagesBusy}
                          onPress={() => handleSendTripMessage(message)}
                        >
                          <Text style={styles.chatQuickReplyText}>{message}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.chatThread}>
                      {tripMessages.length ? (
                        tripMessages.map((message) => {
                          const mine = message.sender.id === session.user.id;
                          return (
                            <View
                              key={message.id}
                              style={[styles.chatBubble, mine ? styles.chatBubbleMine : styles.chatBubbleOther]}
                            >
                              <Text style={styles.chatSenderLabel}>{mine ? "You" : message.sender.fullName}</Text>
                              <Text style={styles.chatBubbleText}>{message.body}</Text>
                              <Text style={styles.chatMetaText}>{formatDateTime(message.createdAt)}</Text>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.emptyText}>No messages.</Text>
                      )}
                    </View>
                    <View style={styles.chatComposerRow}>
                      <TextInput
                        style={styles.chatInput}
                        value={tripMessageDraft}
                        onChangeText={setTripMessageDraft}
                        placeholder="Send a message"
                        placeholderTextColor="#94A3B8"
                        editable={!tripMessagesBusy}
                      />
                      <Pressable
                        style={[styles.chatSendButton, (tripMessagesBusy || !tripMessageDraft.trim()) && styles.buttonDisabled]}
                        disabled={tripMessagesBusy || !tripMessageDraft.trim()}
                        onPress={() => handleSendTripMessage()}
                      >
                        <Text style={styles.chatSendButtonText}>{tripMessagesBusy ? "..." : "Send"}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.emptyText}>No active trips.</Text>
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
                {renderRatingBlock(booking)}
              </View>
            ))}
          </View>
        ) : null}

        {tab === "account" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Account</Text>
            {!isCustomerReadyForBooking ? (
              <View style={styles.bookingVerificationCard}>
                <Text style={styles.bookingVerificationTitle}>LET’S GET YOU VERIFIED</Text>
                <Text style={styles.bookingVerificationStep}>1. Add your phone number</Text>
                <Text style={styles.bookingVerificationStep}>2. Confirm your identity</Text>
                <Text style={styles.bookingVerificationStep}>3. Add your vehicle</Text>
              </View>
            ) : null}
            {isVerifiedCustomer ? (
              <View style={styles.verifiedCustomerBadge}>
                <Text style={styles.verifiedCustomerBadgeText}>✓ CHAUFX VERIFIED CUSTOMER</Text>
              </View>
            ) : null}
            <View style={styles.accountIdentityRow}>
              <Text style={styles.accountLabel}>Name</Text>
              <Text style={styles.accountValue} numberOfLines={1}>{profile?.fullName ?? session.user.fullName}</Text>
            </View>
            <View style={styles.accountIdentityRow}>
              <Text style={styles.accountLabel}>Email</Text>
              <Text style={styles.accountValue} numberOfLines={1}>{profile?.email ?? session.user.email}</Text>
            </View>

            <View style={styles.accountFormSection}>
              <Text style={styles.accountSectionTitle}>Personal details</Text>
              <TextInput
                style={styles.accountTextInput}
                placeholder="Mobile phone (+1)"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={17}
                value={customerAccountForm.phone}
                onChangeText={(value) => setCustomerAccountForm((current) => ({ ...current, phone: formatCanadianPhoneNumber(value) }))}
              />
              <Pressable
                style={styles.accountTextInput}
                onPress={() => {
                  setDateOfBirthPickerValue(
                    customerAccountForm.dateOfBirth
                      ? new Date(`${customerAccountForm.dateOfBirth}T12:00:00`)
                      : new Date(1990, 0, 1)
                  );
                  setShowDateOfBirthPicker(true);
                }}
              >
                <Text style={customerAccountForm.dateOfBirth ? styles.accountTextInputValue : styles.accountTextInputPlaceholder}>
                  {customerAccountForm.dateOfBirth ? formatDateOfBirthDisplay(customerAccountForm.dateOfBirth) : "Date of birth"}
                </Text>
              </Pressable>
              {showDateOfBirthPicker ? (
                <View style={styles.dateOfBirthPickerWrap}>
                  <DateTimePicker
                    value={dateOfBirthPickerValue}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={new Date(1900, 0, 1)}
                    maximumDate={getLatestEligibleBirthDate()}
                    onChange={(event, value) => {
                      if (Platform.OS === "ios") {
                        if (value) {
                          setDateOfBirthPickerValue(value);
                        }
                        return;
                      }

                      if (event.type === "set" && value) {
                        setCustomerAccountForm((current) => ({ ...current, dateOfBirth: formatLocalDate(value) }));
                      }
                      setShowDateOfBirthPicker(false);
                    }}
                  />
                  {Platform.OS === "ios" ? (
                    <Pressable
                      style={styles.dateOfBirthDoneButton}
                      onPress={() => {
                        setCustomerAccountForm((current) => ({ ...current, dateOfBirth: formatLocalDate(dateOfBirthPickerValue) }));
                        setShowDateOfBirthPicker(false);
                      }}
                    >
                      <Text style={styles.dateOfBirthDoneText}>Done</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <TextInput
                style={styles.accountTextInput}
                placeholder="Home or primary address"
                placeholderTextColor="#94A3B8"
                value={customerAccountForm.primaryAddress}
                onChangeText={(value) => setCustomerAccountForm((current) => ({ ...current, primaryAddress: value }))}
                multiline
              />
            </View>

            <View style={styles.accountFormSection}>
              <Text style={styles.accountSectionTitle}>Emergency contact</Text>
              <TextInput
                style={styles.accountTextInput}
                placeholder="Emergency contact name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                value={customerAccountForm.emergencyContactName}
                onChangeText={(value) => setCustomerAccountForm((current) => ({ ...current, emergencyContactName: value }))}
              />
              <TextInput
                style={styles.accountTextInput}
                placeholder="Emergency phone (+1)"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={17}
                value={customerAccountForm.emergencyContactPhone}
                onChangeText={(value) =>
                  setCustomerAccountForm((current) => ({ ...current, emergencyContactPhone: formatCanadianPhoneNumber(value) }))
                }
              />
            </View>

            <View style={styles.accountFormSection}>
              <Text style={styles.accountSectionTitle}>Vehicle</Text>
              <TextInput
                style={styles.accountTextInput}
                placeholder="Vehicle make"
                placeholderTextColor="#94A3B8"
                value={customerAccountForm.vehicleMake}
                onChangeText={(value) => setCustomerAccountForm((current) => ({ ...current, vehicleMake: value }))}
              />
              <TextInput
                style={styles.accountTextInput}
                placeholder="Vehicle model"
                placeholderTextColor="#94A3B8"
                value={customerAccountForm.vehicleModel}
                onChangeText={(value) => setCustomerAccountForm((current) => ({ ...current, vehicleModel: value }))}
              />
              <TextInput
                style={styles.accountTextInput}
                placeholder="Licence plate"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={customerAccountForm.licencePlate}
                onChangeText={(value) => setCustomerAccountForm((current) => ({ ...current, licencePlate: value }))}
              />
              <TextInput
                style={styles.accountTextInput}
                placeholder="Province of registration"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                value={customerAccountForm.registrationProvince}
                onChangeText={(value) => setCustomerAccountForm((current) => ({ ...current, registrationProvince: value }))}
              />
            </View>

            <View style={styles.accountFormSection}>
              <Text style={styles.accountSectionTitle}>Government issued photo ID</Text>
              <Text style={styles.accountDocumentStatus}>
                {governmentPhotoId?.fileName ?? profile?.customerProfile?.identityDocument?.fileName ?? "No photo ID selected"}
              </Text>
              <Pressable style={styles.secondaryButton} onPress={handlePickGovernmentPhotoId}>
                <Text style={styles.secondaryButtonText}>
                  {governmentPhotoId || profile?.customerProfile?.identityDocument ? "Replace photo ID" : "Select photo ID"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.accountFormSection}>
              <Text style={styles.accountSectionTitle}>Confirmations</Text>
              <View style={styles.confirmationRow}>
                <Pressable
                  style={styles.confirmationToggle}
                onPress={() =>
                  setCustomerAccountForm((current) => ({
                    ...current,
                    vehicleComplianceConfirmed: !current.vehicleComplianceConfirmed
                  }))
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: customerAccountForm.vehicleComplianceConfirmed }}
              >
                <View style={[styles.confirmationBox, customerAccountForm.vehicleComplianceConfirmed && styles.confirmationBoxSelected]}>
                  <Text style={styles.confirmationMark}>{customerAccountForm.vehicleComplianceConfirmed ? "✓" : ""}</Text>
                </View>
                </Pressable>
                <Text style={styles.confirmationText}>
                  My vehicle is properly registered, fully insured, and meets Canadian road safety requirements. Read{" "}
                  <Text style={styles.confirmationLink} onPress={() => openAccountPolicy(termsUrl)}>Terms & Conditions</Text>.
                </Text>
              </View>
              <View style={styles.confirmationRow}>
                <Pressable
                  style={styles.confirmationToggle}
                onPress={() => setCustomerAccountForm((current) => ({ ...current, termsAccepted: !current.termsAccepted }))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: customerAccountForm.termsAccepted }}
              >
                <View style={[styles.confirmationBox, customerAccountForm.termsAccepted && styles.confirmationBoxSelected]}>
                  <Text style={styles.confirmationMark}>{customerAccountForm.termsAccepted ? "✓" : ""}</Text>
                </View>
                </Pressable>
                <Text style={styles.confirmationText}>
                  I accept the ChaufX <Text style={styles.confirmationLink} onPress={() => openAccountPolicy(termsUrl)}>Terms & Conditions</Text>.
                </Text>
              </View>
              <View style={styles.confirmationRow}>
                <Pressable
                  style={styles.confirmationToggle}
                onPress={() => setCustomerAccountForm((current) => ({ ...current, privacyPolicyAccepted: !current.privacyPolicyAccepted }))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: customerAccountForm.privacyPolicyAccepted }}
              >
                <View style={[styles.confirmationBox, customerAccountForm.privacyPolicyAccepted && styles.confirmationBoxSelected]}>
                  <Text style={styles.confirmationMark}>{customerAccountForm.privacyPolicyAccepted ? "✓" : ""}</Text>
                </View>
                </Pressable>
                <Text style={styles.confirmationText}>
                  I accept the <Text style={styles.confirmationLink} onPress={() => openAccountPolicy(privacyPolicyUrl)}>Privacy Policy</Text>.
                </Text>
              </View>
              <View style={styles.confirmationRow}>
                <Pressable
                  style={styles.confirmationToggle}
                onPress={() =>
                  setCustomerAccountForm((current) => ({
                    ...current,
                    identityVerificationConsented: !current.identityVerificationConsented
                  }))
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: customerAccountForm.identityVerificationConsented }}
              >
                <View style={[styles.confirmationBox, customerAccountForm.identityVerificationConsented && styles.confirmationBoxSelected]}>
                  <Text style={styles.confirmationMark}>{customerAccountForm.identityVerificationConsented ? "✓" : ""}</Text>
                </View>
                </Pressable>
                <Text style={styles.confirmationText}>
                  I consent to identity verification under the <Text style={styles.confirmationLink} onPress={() => openAccountPolicy(privacyPolicyUrl)}>Privacy Policy</Text>.
                </Text>
              </View>
              <View style={styles.confirmationRow}>
                <Pressable
                  style={styles.confirmationToggle}
                onPress={() =>
                  setCustomerAccountForm((current) => ({
                    ...current,
                    vehicleAuthorityConfirmed: !current.vehicleAuthorityConfirmed
                  }))
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: customerAccountForm.vehicleAuthorityConfirmed }}
              >
                <View style={[styles.confirmationBox, customerAccountForm.vehicleAuthorityConfirmed && styles.confirmationBoxSelected]}>
                  <Text style={styles.confirmationMark}>{customerAccountForm.vehicleAuthorityConfirmed ? "✓" : ""}</Text>
                </View>
                </Pressable>
                <Text style={styles.confirmationText}>
                  I have authority to allow the driver to operate this vehicle. Read{" "}
                  <Text style={styles.confirmationLink} onPress={() => openAccountPolicy(termsUrl)}>Terms & Conditions</Text>.
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, customerProfileSaving && styles.buttonDisabled]}
              disabled={customerProfileSaving}
              onPress={handleSaveCustomerProfile}
            >
              {customerProfileSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save account details</Text>}
            </Pressable>
            <Pressable style={styles.deleteAccountButton} onPress={requestAccountDeletion} accessibilityRole="button">
              <Text style={styles.deleteAccountButtonText}>Delete account</Text>
            </Pressable>
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
            preferCanadaFallback={androidLocationFallbackActive && !pickupCoordinate}
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
                  <Text style={styles.paymentGateCancelText}>Cancel payment</Text>
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
  headerGreeting: {
    fontSize: 18,
    fontWeight: "400"
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
  mapFill: {
    ...StyleSheet.absoluteFillObject
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
  bookingVerificationCard: {
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 14,
    gap: 7
  },
  bookingVerificationTitle: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  bookingVerificationStep: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600"
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
  locationHintCard: {
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    padding: 14,
    gap: 6
  },
  locationHintTitle: {
    color: "#9A3412",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  locationHintText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 19
  },
  pickupLockedCard: {
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#86EFAC",
    padding: 14,
    gap: 8
  },
  pickupLockedBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  pickupLockedDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#16A34A"
  },
  pickupLockedBadgeText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800"
  },
  pickupLockedText: {
    color: "#166534",
    fontSize: 13,
    lineHeight: 19
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
  deleteAccountButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF1F2",
    paddingVertical: 14,
    alignItems: "center"
  },
  deleteAccountButtonText: {
    color: "#BE123C",
    fontSize: 16,
    fontWeight: "800"
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
  preferredDriversCard: {
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    padding: 12,
    gap: 8
  },
  preferredDriversHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  preferredDriversTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800"
  },
  noPreferenceButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  noPreferenceText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700"
  },
  preferredDriverRow: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E1EC",
    backgroundColor: "#FFFFFF",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  preferredDriverSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF"
  },
  preferredDriverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center"
  },
  preferredDriverAvatarText: {
    color: "#1D4ED8",
    fontSize: 16,
    fontWeight: "800"
  },
  preferredDriverCopy: {
    flex: 1,
    gap: 3
  },
  preferredDriverName: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800"
  },
  preferredDriverMeta: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17
  },
  preferredDriverSelectedText: {
    color: "#1E3A8A"
  },
  preferredDriverSelectedMeta: {
    color: "#1D4ED8"
  },
  preferredDriverCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center"
  },
  preferredDriverCheckSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB"
  },
  preferredDriverCheckText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
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
  chatCard: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    padding: 12,
    gap: 10
  },
  chatTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800"
  },
  chatQuickReplyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chatQuickReplyChip: {
    borderRadius: 999,
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chatQuickReplyText: {
    color: "#4338CA",
    fontSize: 12,
    fontWeight: "700"
  },
  chatThread: {
    gap: 8
  },
  chatBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4
  },
  chatBubbleMine: {
    backgroundColor: "#DBEAFE",
    alignSelf: "flex-end",
    maxWidth: "88%"
  },
  chatBubbleOther: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignSelf: "flex-start",
    maxWidth: "88%"
  },
  chatSenderLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700"
  },
  chatBubbleText: {
    color: "#0F172A",
    fontSize: 14,
    lineHeight: 20
  },
  chatMetaText: {
    color: "#64748B",
    fontSize: 11
  },
  chatComposerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  chatInput: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0F172A",
    fontSize: 14
  },
  chatSendButton: {
    borderRadius: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  chatSendButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  ratingBlock: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    padding: 12,
    gap: 10
  },
  ratingComposer: {
    gap: 10
  },
  ratingLabel: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "800"
  },
  ratingSummary: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700"
  },
  ratingStarsRow: {
    flexDirection: "row",
    gap: 8
  },
  ratingStarButton: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  ratingStarText: {
    color: "#94A3B8",
    fontSize: 24,
    lineHeight: 28
  },
  ratingStarTextActive: {
    color: "#F59E0B"
  },
  ratingActionsRow: {
    flexDirection: "row",
    gap: 10
  },
  ratingActionButton: {
    alignSelf: "flex-start",
    borderRadius: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  ratingActionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  ratingSubmitButton: {
    borderRadius: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  ratingSubmitButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700"
  },
  ratingCancelButton: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  ratingCancelButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700"
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
  authModeLink: {
    alignSelf: "center",
    paddingTop: 2
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
  routingPanel: {
    borderRadius: 24,
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 16,
    gap: 8
  },
  routingEyebrow: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  routingTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22
  },
  routingCopy: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19
  },
  routingCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 4
  },
  routingCardTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800"
  },
  routingCardDistance: {
    color: "#2563EB",
    fontSize: 18,
    fontWeight: "800"
  },
  routingCardStatus: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700"
  },
  routingDots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center"
  },
  routingDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#BFDBFE"
  },
  routingDotActive: {
    width: 20,
    backgroundColor: "#2563EB"
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
  accountIdentityRow: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
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
    flexShrink: 1,
    textAlign: "right"
  },
  verifiedCustomerBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  verifiedCustomerBadgeText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9
  },
  accountFormSection: {
    gap: 10,
    paddingTop: 4
  },
  accountSectionTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700"
  },
  accountTextInput: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#0F172A",
    fontSize: 15,
    justifyContent: "center"
  },
  accountTextInputValue: {
    color: "#0F172A",
    fontSize: 15
  },
  accountTextInputPlaceholder: {
    color: "#94A3B8",
    fontSize: 15
  },
  dateOfBirthPickerWrap: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    overflow: "hidden"
  },
  dateOfBirthDoneButton: {
    alignSelf: "flex-end",
    marginRight: 12,
    marginBottom: 12,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 9
  },
  dateOfBirthDoneText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  accountDocumentStatus: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20
  },
  confirmationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 5
  },
  confirmationToggle: {
    padding: 0
  },
  confirmationBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  confirmationBoxSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB"
  },
  confirmationMark: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18
  },
  confirmationText: {
    flex: 1,
    color: "#334155",
    fontSize: 14,
    lineHeight: 20
  },
  confirmationLink: {
    color: "#2563EB",
    fontWeight: "800",
    textDecorationLine: "underline"
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
