import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDateTime } from "@chaufx/ui";
import {
  acceptBooking,
  endTrip,
  fetchBookings,
  fetchDriverProfile,
  fetchMapState,
  fetchNotifications,
  login,
  markTripEnRoute,
  markNotificationRead,
  notifyTripArrival,
  rejectBooking,
  requestPasswordReset,
  registerPushDevice,
  setAvailability,
  shareLocation,
  startTrip,
  updateDriverLocation
} from "./src/lib/api";

type Tab = "home" | "account";
type Coordinate = { latitude: number; longitude: number };
type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  createdAt: string;
  meta?: Record<string, unknown> | null;
};
type TripStartReminder = {
  bookingId: string;
  title: string;
  body: string;
};
type NotificationsModule = typeof import("expo-notifications");
type NotificationSubscription = { remove(): void };

const logo = require("./assets/chaufx-mark.png");
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
const pushNotificationsEnabled = process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === "true";
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function isSessionExpiredError(error: unknown) {
  return error instanceof Error && error.message === "Session expired. Please sign in again.";
}

async function registerForPushNotificationsAsync(appVariant: "customer" | "driver") {
  if (!Constants.isDevice) {
    return null;
  }

  const notifications = await loadNotificationsModule();
  if (!notifications) {
    return null;
  }

  const permission = await notifications.getPermissionsAsync();
  const permissionState = permission as { granted?: boolean; status?: string };
  let granted = permissionState.granted ?? permissionState.status === "granted";

  if (!granted) {
    const requested = await notifications.requestPermissionsAsync();
    const requestedState = requested as { granted?: boolean; status?: string };
    granted = requestedState.granted ?? requestedState.status === "granted";
  }

  if (!granted) {
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    ((Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? null);

  if (!projectId) {
    return null;
  }

  const token = await notifications.getExpoPushTokenAsync({ projectId });
  return {
    expoPushToken: token.data,
    platform: Platform.OS === "android" ? ("android" as const) : ("ios" as const),
    appVariant
  };
}

async function loadNotificationsModule() {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications")
      .then((module) => {
        module.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false
          })
        });
        return module;
      })
      .catch(() => null);
  }

  return notificationsModulePromise;
}

function Marker({ color, variant }: { color: string; variant: "pickup" | "destination" }) {
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

  return (
    <Animated.View
      style={[
        styles.markerPulse,
        { backgroundColor: color, opacity: pulse, transform: [{ scale: pulse }] }
      ]}
    />
  );
}

function toneColor(status?: string) {
  const normalized = String(status ?? "").toLowerCase();
  if (["active", "completed"].includes(normalized)) return "#16A34A";
  if (["accepted", "enroute"].includes(normalized)) return "#2563EB";
  if (normalized === "pending") return "#D97706";
  if (normalized === "cancelled") return "#DC2626";
  return "#2563EB";
}

function formatRequestType(value?: string) {
  return value === "LATER" ? "Schedule later" : "ChaufX now";
}

function isSameDay(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getDriverProvince(profile: any) {
  const rawProvince = profile?.application?.preferredServiceAreas?.[0] ?? profile?.serviceAreas?.[0];

  if (!rawProvince) {
    return "Not provided";
  }

  if (String(rawProvince).startsWith("WPG-")) {
    return "Manitoba";
  }

  return rawProvince;
}

function formatDriverAverageRating(profile: any) {
  const average = Number(profile?.ratingSummary?.averageScore ?? 0);
  const total = Number(profile?.ratingSummary?.totalRatings ?? 0);

  if (!total || !Number.isFinite(average)) {
    return "No ratings yet";
  }

  return `${average.toFixed(1)} / 5.0`;
}

function formatDriverRatingCount(profile: any) {
  const total = Number(profile?.ratingSummary?.totalRatings ?? 0);
  return `${total} review${total === 1 ? "" : "s"}`;
}

function formatHours(expectedDurationMinutes?: number) {
  if (!expectedDurationMinutes || expectedDurationMinutes <= 0) {
    return "Not set";
  }

  const hours = Math.ceil(expectedDurationMinutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function isPaymentRecorded(status?: string) {
  return String(status ?? "").toLowerCase() === "recorded";
}

function getDriverLiveRefreshMs(status?: string) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "active") {
    return 10000;
  }

  if (normalized === "enroute") {
    return 15000;
  }

  return 30000;
}

function windowsOverlapByBooking(
  left: { scheduledStartAt: string; expectedDurationMinutes?: number },
  right: { scheduledStartAt: string; expectedDurationMinutes?: number }
) {
  const leftStart = new Date(left.scheduledStartAt).getTime();
  const rightStart = new Date(right.scheduledStartAt).getTime();
  const leftEnd = leftStart + Math.max(0, left.expectedDurationMinutes ?? 0) * 60_000;
  const rightEnd = rightStart + Math.max(0, right.expectedDurationMinutes ?? 0) * 60_000;

  return leftStart < rightEnd && rightStart < leftEnd;
}

function formatStartsIn(value: string) {
  const scheduledAt = new Date(value);
  const diffMs = scheduledAt.getTime() - Date.now();

  if (diffMs <= 0) {
    return "Starting now";
  }

  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) {
    return `Starts in ${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes
    ? `Starts in ${hours}h ${minutes}m`
    : `Starts in ${hours} hour${hours === 1 ? "" : "s"}`;
}

function isWithinReminderWindow(value: string, hoursAhead = 4) {
  const diffMs = new Date(value).getTime() - Date.now();
  return diffMs > 0 && diffMs <= hoursAhead * 60 * 60 * 1000;
}

function getOperationLabel(status?: string) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "active") {
    return "Trip in progress";
  }
  if (normalized === "enroute") {
    return "Heading to pickup";
  }
  if (normalized === "accepted") {
    return "Assigned and waiting";
  }
  return "Awaiting next step";
}

function distanceInKm(left: Coordinate, right: Coordinate) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(right.latitude - left.latitude);
  const deltaLng = toRadians(right.longitude - left.longitude);
  const startLat = toRadians(left.latitude);
  const endLat = toRadians(right.latitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    zoomLevel: 12.6,
    centerCoordinate: [fallback.longitude, fallback.latitude] as [number, number],
    animationMode: "easeTo" as const,
    animationDuration: 600
  };
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

function DriverMap({
  driverCoordinate,
  pickupCoordinate,
  destinationCoordinate
}: {
  driverCoordinate: Coordinate | null;
  pickupCoordinate: Coordinate | null;
  destinationCoordinate: Coordinate | null;
}) {
  const shouldUseDriverForCamera =
    Boolean(driverCoordinate) &&
    (!pickupCoordinate || distanceInKm(driverCoordinate as Coordinate, pickupCoordinate) <= 75);
  const center =
    (shouldUseDriverForCamera ? driverCoordinate : null) ??
    pickupCoordinate ??
    destinationCoordinate ??
    { latitude: 49.8951, longitude: -97.1384 };
  const cameraPoints = [
    shouldUseDriverForCamera ? driverCoordinate : null,
    pickupCoordinate,
    destinationCoordinate
  ].filter(Boolean) as Coordinate[];
  const cameraProps = buildCameraProps(
    cameraPoints,
    center
  );
  const [routeShape, setRouteShape] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    if (!pickupCoordinate || !destinationCoordinate) {
      setRouteShape(null);
      return;
    }

    fetchRouteGeometry(pickupCoordinate, destinationCoordinate)
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
  }, [pickupCoordinate, destinationCoordinate]);

  if (!mapboxToken) {
    return (
      <View style={styles.mapFallback}>
        <Text style={styles.mapFallbackTitle}>Mapbox token needed</Text>
        <Text style={styles.mapFallbackText}>
          Add `EXPO_PUBLIC_MAPBOX_TOKEN` and run a custom Expo dev build to enable live maps.
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
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
    >
      <Mapbox.Camera {...cameraProps} />
      {driverCoordinate ? <Mapbox.LocationPuck visible puckBearingEnabled puckBearing="heading" /> : null}
      {pickupCoordinate ? (
        <Mapbox.PointAnnotation id="pickup" coordinate={[pickupCoordinate.longitude, pickupCoordinate.latitude]}>
          <Marker color="#EA580C" variant="pickup" />
        </Mapbox.PointAnnotation>
      ) : null}
      {destinationCoordinate ? (
        <Mapbox.PointAnnotation id="dropoff" coordinate={[destinationCoordinate.longitude, destinationCoordinate.latitude]}>
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
  const [session, setSession] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [passwordResetVisible, setPasswordResetVisible] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  const [passwordResetBusy, setPasswordResetBusy] = useState(false);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [mapState, setMapState] = useState<any>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [localDriverUpdates, setLocalDriverUpdates] = useState<AppNotification[]>([]);
  const [driverCoordinate, setDriverCoordinate] = useState<Coordinate | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "streaming" | "paused">("idle");
  const [activeRequestPromptId, setActiveRequestPromptId] = useState<string | null>(null);
  const [tripStartReminder, setTripStartReminder] = useState<TripStartReminder | null>(null);
  const [arrivalNoticeBookingId, setArrivalNoticeBookingId] = useState<string | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const lastTripShareRef = useRef<{ bookingId: string; at: number } | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const promptedRequestIdsRef = useRef<Set<string>>(new Set());
  const shownTripReminderKeysRef = useRef<Set<string>>(new Set());
  const notificationResponseRef = useRef<NotificationSubscription | null>(null);
  const loginInFlightRef = useRef(false);
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

    void refreshDashboard();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!pushNotificationsEnabled || !session?.accessToken) {
      return;
    }

    void primeCurrentLocation();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let active = true;

    registerForPushNotificationsAsync("driver")
      .then((device) => {
        if (!active || !device) {
          return;
        }

        return registerPushDevice(session.accessToken, device);
      })
      .catch(() => {
        // Polling still keeps the driver view current if push registration is unavailable.
      });

    notificationResponseRef.current?.remove();
    if (!Constants.isDevice) {
      return () => {
        active = false;
        notificationResponseRef.current?.remove();
        notificationResponseRef.current = null;
      };
    }

    loadNotificationsModule().then((notifications) => {
      if (!active || !notifications) {
        return;
      }

      notificationResponseRef.current = notifications.addNotificationResponseReceivedListener(() => {
        setTab("home");
        void refreshDashboard();
      });
    });

    return () => {
      active = false;
      notificationResponseRef.current?.remove();
      notificationResponseRef.current = null;
    };
  }, [session?.accessToken]);

  const incomingRequests = useMemo(
    () => bookings.filter((booking) => String(booking.status).toLowerCase() === "pending"),
    [bookings]
  );
  const activeIncomingRequest = useMemo(
    () => incomingRequests.find((booking) => booking.id === activeRequestPromptId) ?? null,
    [activeRequestPromptId, incomingRequests]
  );
  const assignedTrips = useMemo(
    () => bookings.filter((booking) => booking.assignedDriverId === driverProfile?.id),
    [bookings, driverProfile?.id]
  );
  const currentTrip = useMemo(() => {
    const now = new Date();
    return (
      [...assignedTrips].sort(
        (left, right) =>
          new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime()
      ).find((booking) => {
        const status = String(booking.status).toLowerCase();
        const scheduledAt = new Date(booking.scheduledStartAt);
        if (!["accepted", "enroute", "active"].includes(status)) {
          return false;
        }

        if (status === "active" || status === "enroute") {
          return true;
        }

        return isSameDay(scheduledAt, now) || scheduledAt > now;
      }) ?? null
    );
  }, [assignedTrips]);
  const liveRefreshMs = getDriverLiveRefreshMs(currentTrip?.status);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    const interval = setInterval(() => {
      void refreshDashboard();
    }, liveRefreshMs);

    return () => clearInterval(interval);
  }, [liveRefreshMs, session?.accessToken]);

  const scheduledTrips = useMemo(() => {
    const now = new Date();
    return assignedTrips.filter((booking) => {
      const status = String(booking.status).toLowerCase();
      const scheduledAt = new Date(booking.scheduledStartAt);
      return ["pending", "accepted"].includes(status) && scheduledAt > now && booking.id !== currentTrip?.id;
    });
  }, [assignedTrips, currentTrip?.id]);

  const pickupCoordinate = useMemo<Coordinate | null>(() => {
    if (!currentTrip) {
      return null;
    }
    return { latitude: currentTrip.pickupLat, longitude: currentTrip.pickupLng };
  }, [currentTrip]);

  const destinationCoordinate = useMemo<Coordinate | null>(() => {
    if (!currentTrip) {
      return null;
    }
    return { latitude: currentTrip.destinationLat, longitude: currentTrip.destinationLng };
  }, [currentTrip]);
  const reminderTrips = useMemo(
    () => scheduledTrips.filter((booking) => isWithinReminderWindow(booking.scheduledStartAt)).slice(0, 2),
    [scheduledTrips]
  );
  const visibleLiveUpdates = useMemo(
    () =>
      [...localDriverUpdates, ...notifications]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 4),
    [localDriverUpdates, notifications]
  );
  const conflictingIncomingRequestIds = useMemo(() => {
    const protectedTrips = assignedTrips.filter((booking) =>
      ["accepted", "enroute", "active"].includes(String(booking.status).toLowerCase())
    );

    return new Set(
      incomingRequests
        .filter((request) => protectedTrips.some((booking) => windowsOverlapByBooking(request, booking)))
        .map((request) => request.id)
    );
  }, [assignedTrips, incomingRequests]);

  async function syncDriverLocationSnapshot(options?: { publish?: boolean }) {
    if (!session?.accessToken) {
      return null;
    }

    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return null;
    }

    const current =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

    if (!current) {
      return null;
    }

    const coords = {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude
    };

    setDriverCoordinate(coords);

    if (options?.publish) {
      await publishDriverLocation(current.coords);
    }

    return coords;
  }

  function pushLocalDriverUpdate(title: string, body: string, meta?: Record<string, unknown> | null) {
    const entry: AppNotification = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      body,
      type: "LOCAL_DRIVER_REMINDER",
      status: "SENT",
      createdAt: new Date().toISOString(),
      meta: meta ?? null
    };

    setLocalDriverUpdates((current) => [entry, ...current].slice(0, 8));
  }

  useEffect(() => {
    const pendingIds = new Set(incomingRequests.map((booking) => booking.id));
    promptedRequestIdsRef.current = new Set(
      [...promptedRequestIdsRef.current].filter((id) => pendingIds.has(id))
    );

    if (activeRequestPromptId && !pendingIds.has(activeRequestPromptId)) {
      setActiveRequestPromptId(null);
    }

    if (!incomingRequests.length || activeRequestPromptId) {
      return;
    }

    const nextPrompt = [...incomingRequests]
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt ?? left.scheduledStartAt).getTime();
        const rightTime = new Date(right.createdAt ?? right.scheduledStartAt).getTime();
        return rightTime - leftTime;
      })
      .find((booking) => !promptedRequestIdsRef.current.has(booking.id));

    if (!nextPrompt) {
      return;
    }

    promptedRequestIdsRef.current.add(nextPrompt.id);
    setTab("home");
    setActiveRequestPromptId(nextPrompt.id);
    setStatus("New incoming request. Accept or decline now.");
  }, [activeRequestPromptId, incomingRequests]);

  useEffect(() => {
    if (!currentTrip) {
      setTripStartReminder(null);
      return;
    }

    const normalizedStatus = String(currentTrip.status).toLowerCase();
    if (normalizedStatus !== "accepted") {
      return;
    }

    const scheduledTime = new Date(currentTrip.scheduledStartAt).getTime();
    const minutesUntilStart = Math.round((scheduledTime - Date.now()) / 60000);

    let reminderKey: string | null = null;
    let reminderTitle = "";
    let reminderBody = "";

    if (minutesUntilStart <= 0) {
      reminderKey = `${currentTrip.id}:start-now`;
      reminderTitle = "Start trip now";
      reminderBody = "This trip has reached its start time. Head to pickup and start the trip as soon as the rider is ready.";
    } else if (minutesUntilStart <= 5) {
      reminderKey = `${currentTrip.id}:start-soon`;
      reminderTitle = "Trip starts in about 5 minutes";
      reminderBody = "Get ready to begin this trip soon. Head to pickup and be ready to start on time.";
    }

    if (!reminderKey || shownTripReminderKeysRef.current.has(reminderKey)) {
      return;
    }

    shownTripReminderKeysRef.current.add(reminderKey);
    setTab("home");
    setTripStartReminder({
      bookingId: currentTrip.id,
      title: reminderTitle,
      body: reminderBody
    });
    pushLocalDriverUpdate(reminderTitle, reminderBody, {
      bookingId: currentTrip.id,
      reminderKey
    });
    setStatus(reminderBody);
  }, [currentTrip]);

  useEffect(() => {
    if (!session?.accessToken || (!driverProfile?.availabilityStatus && !currentTrip)) {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
      setGpsStatus("idle");
      return;
    }

    let cancelled = false;

    async function startTracking() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setGpsStatus("paused");
        setStatus("Location access is needed to route the nearest requests and share active trip progress.");
        return;
      }

      const current =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

      if (current && !cancelled) {
        const coords = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude
        };
        setDriverCoordinate(coords);
        await publishDriverLocation(current.coords);
      }

      locationWatchRef.current?.remove();
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: liveRefreshMs
        },
        async (update) => {
          if (cancelled) {
            return;
          }
          setDriverCoordinate({
            latitude: update.coords.latitude,
            longitude: update.coords.longitude
          });
          await publishDriverLocation(update.coords);
        }
      );
      setGpsStatus("streaming");
    }

    startTracking().catch((error) => {
      setGpsStatus("paused");
      setStatus(error instanceof Error ? error.message : "Unable to start GPS tracking.");
    });

    return () => {
      cancelled = true;
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [currentTrip?.id, driverProfile?.availabilityStatus, liveRefreshMs, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || (!driverProfile?.availabilityStatus && !currentTrip)) {
      return;
    }

    const interval = setInterval(() => {
      void syncDriverLocationSnapshot({ publish: true }).catch(() => null);
    }, liveRefreshMs);

    return () => clearInterval(interval);
  }, [currentTrip?.id, driverProfile?.availabilityStatus, liveRefreshMs, session?.accessToken]);

  async function publishDriverLocation(coords: Location.LocationObjectCoords) {
    if (!session?.accessToken) {
      return;
    }

    try {
      const updated = await updateDriverLocation(session.accessToken, coords.latitude, coords.longitude);
      setDriverProfile((current: any) => ({ ...(current ?? {}), ...updated }));

      if (currentTrip && mapState?.active) {
        const previous = lastTripShareRef.current;
        if (!previous || previous.bookingId !== currentTrip.id || Date.now() - previous.at > liveRefreshMs) {
          await shareLocation(
            session.accessToken,
            currentTrip.id,
            coords.latitude,
            coords.longitude,
            typeof coords.heading === "number" ? coords.heading : undefined,
            typeof coords.speed === "number" && coords.speed >= 0 ? coords.speed * 3.6 : undefined
          );
          lastTripShareRef.current = {
            bookingId: currentTrip.id,
            at: Date.now()
          };
        }
      }
    } catch (error) {
      setGpsStatus("paused");
      setStatus(error instanceof Error ? error.message : "Unable to sync your live GPS.");
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

      await syncDriverLocationSnapshot({ publish: false });
    } catch {
      // Keep the map available even before GPS is granted.
    }
  }

  async function refreshDashboard() {
    if (!session?.accessToken) {
      return;
    }

    setRefreshing(true);
    try {
      const [profile, bookingList, notificationList] = await Promise.all([
        fetchDriverProfile(session.accessToken),
        fetchBookings(session.accessToken),
        fetchNotifications(session.accessToken)
      ]);
      setDriverProfile(profile);
      setBookings(bookingList);
      setNotifications(notificationList);

      if (seenNotificationIdsRef.current.size === 0) {
        seenNotificationIdsRef.current = new Set(notificationList.map((item) => item.id));
      } else {
        const newItems = notificationList.filter((item) => !seenNotificationIdsRef.current.has(item.id));

        if (newItems.length) {
          for (const item of newItems) {
            seenNotificationIdsRef.current.add(item.id);
          }

          const latest = newItems[0];
          setStatus(`${latest.title} · ${latest.body}`);
          void Promise.all(
            newItems.map((item) => markNotificationRead(session.accessToken, item.id).catch(() => null))
          );
        }
      }

      const trackable = bookingList.find((booking) => booking.assignedDriverId === profile.id && ["accepted", "enroute", "active"].includes(String(booking.status).toLowerCase()));
      if (trackable) {
        setMapState(await fetchMapState(session.accessToken, trackable.id));
      } else {
        setMapState(null);
      }

      if (profile.availabilityStatus || trackable) {
        await syncDriverLocationSnapshot({ publish: true });
      }
    } catch (error) {
      if (isSessionExpiredError(error)) {
        logout();
        if (!loginInFlightRef.current) {
          setStatus("Session expired. Please sign in again.");
        }
        return;
      }
      setStatus(error instanceof Error ? error.message : "Unable to refresh the driver app.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogin() {
    loginInFlightRef.current = true;
    setBusy(true);
    setStatus("");
    try {
      const nextSession = await login(loginEmail.trim(), loginPassword);
      setSession(nextSession);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      loginInFlightRef.current = false;
      setBusy(false);
    }
  }

  async function handleRequestPasswordReset() {
    const email = passwordResetEmail.trim() || loginEmail.trim();
    if (!email) {
      setStatus("Enter your email address to request a password reset.");
      return;
    }

    setPasswordResetBusy(true);
    try {
      await requestPasswordReset(email);
      setPasswordResetVisible(false);
      setPasswordResetEmail(email);
      setStatus("If the account exists, a password reset link has been sent to the email address.");
      Alert.alert("Reset link sent", "If the account exists, a password reset link has been sent to the email address.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to request a password reset.");
    } finally {
      setPasswordResetBusy(false);
    }
  }

  async function toggleAvailability(value: boolean) {
    if (!session?.accessToken) {
      return;
    }

    setBusy(true);
    try {
      const updated = await setAvailability(session.accessToken, value);
      setDriverProfile((current: any) => ({ ...(current ?? {}), ...updated }));
      setStatus(value ? "You are online and ready for nearby requests." : "You are offline.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update availability.");
    } finally {
      setBusy(false);
    }
  }

  async function decideRequest(bookingId: string, action: "accept" | "reject") {
    if (!session?.accessToken) {
      return;
    }

    if (action === "accept" && conflictingIncomingRequestIds.has(bookingId)) {
      setStatus("This request overlaps with another trip you already accepted.");
      return;
    }

    setBusy(true);
    try {
      if (action === "accept") {
        await acceptBooking(session.accessToken, bookingId);
        setStatus("Trip accepted.");
      } else {
        await rejectBooking(session.accessToken, bookingId);
        setStatus("Request declined.");
      }
      if (activeRequestPromptId === bookingId) {
        setActiveRequestPromptId(null);
      }
      await refreshDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update this request.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTripAction(action: "enroute" | "start" | "end") {
    if (!session?.accessToken || !currentTrip) {
      return;
    }

    if (action === "start" && !isPaymentRecorded(currentTrip.payment?.status)) {
      const message = "Customer payment must be completed before you can start the trip.";
      setStatus(message);
      Alert.alert("Payment required", message);
      return;
    }

    setBusy(true);
    try {
      if (action === "enroute") {
        await markTripEnRoute(session.accessToken, currentTrip.id);
        setStatus("Heading to pickup.");
        Alert.alert("En route", "The rider has been notified that you are on the way.");
      } else if (action === "start") {
        await startTrip(session.accessToken, currentTrip.id);
        setStatus("Trip started.");
        Alert.alert("Trip started", "Live trip tracking is now active.");
      } else {
        await endTrip(session.accessToken, currentTrip.id);
        setStatus("Trip completed.");
        Alert.alert("Trip completed", "This trip has been completed successfully.");
      }
      await refreshDashboard();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update trip status.";
      setStatus(message);
      Alert.alert("Trip action unavailable", message);
    } finally {
      setBusy(false);
    }
  }

  async function handleNotifyArrival() {
    if (!session?.accessToken || !currentTrip) {
      return;
    }

    setArrivalNoticeBookingId(currentTrip.id);
    try {
      await notifyTripArrival(session.accessToken, currentTrip.id);
      setStatus("Customer has been notified that you arrived at pickup.");
      pushLocalDriverUpdate("Arrival notice sent", "Customer has been notified that you arrived at pickup.", {
        bookingId: currentTrip.id
      });
      await refreshDashboard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to notify the customer right now.");
    } finally {
      setArrivalNoticeBookingId(null);
    }
  }

  function logout() {
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
    lastTripShareRef.current = null;
    setSession(null);
    setDriverProfile(null);
    setBookings([]);
    setMapState(null);
    setNotifications([]);
    setLocalDriverUpdates([]);
    setDriverCoordinate(null);
    setGpsStatus("idle");
    setStatus("");
    setActiveRequestPromptId(null);
    setTripStartReminder(null);
    seenNotificationIdsRef.current = new Set();
    promptedRequestIdsRef.current = new Set();
    shownTripReminderKeysRef.current = new Set();
    notificationResponseRef.current?.remove();
    notificationResponseRef.current = null;
  }

  const currentTripAction = useMemo(() => {
    if (!currentTrip) {
      return null;
    }

    const normalizedStatus = String(currentTrip.status).toLowerCase();

    if (!mapState?.active && normalizedStatus !== "active") {
      return {
        label: "Trip window locked",
        action: null as "enroute" | "start" | "end" | null,
        disabled: true,
        helper:
          mapState?.activationStartsAt
            ? `Trip tools unlock ${formatDateTime(mapState.activationStartsAt)}.`
            : "Trip tools unlock shortly before pickup."
      };
    }

    if (normalizedStatus === "accepted") {
      if (!isPaymentRecorded(currentTrip.payment?.status)) {
        return {
          label: "Awaiting payment",
          action: null as "enroute" | "start" | "end" | null,
          disabled: true,
          helper: "Customer payment must be completed before you can head to pickup."
        };
      }

      return {
        label: "Head to pickup",
        action: "enroute" as const,
        disabled: false,
        helper: "Let the rider know you are on the way and keep location sharing active."
      };
    }

    if (normalizedStatus === "enroute") {
      if (!isPaymentRecorded(currentTrip.payment?.status)) {
        return {
          label: "Awaiting payment",
          action: null as "enroute" | "start" | "end" | null,
          disabled: true,
          helper: "Customer payment must be completed before you can start the trip."
        };
      }

      return {
        label: "Start trip",
        action: "start" as const,
        disabled: false,
        helper: "Start once the rider is in the vehicle and you are ready to drive."
      };
    }

    return {
      label: "End trip",
      action: "end" as const,
      disabled: false,
      helper: "Finish the trip after dropoff and settlement handoff."
    };
  }, [currentTrip, mapState]);

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
          DRIVER ACCESS
        </Text>
        <Text style={[styles.loginTitle, isAndroidLoginMode ? styles.loginTitleCompact : null]}>Driver App</Text>
        {!isAndroidLoginMode ? (
          <Text style={styles.loginCopy}>
            Go online, receive nearby requests, and unlock trip management tools.
          </Text>
        ) : null}

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
            showSoftInputOnFocus={isAndroidLoginMode}
          />
          <View style={styles.passwordFieldRow}>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showLoginPassword}
              style={styles.passwordInput}
              value={loginPassword}
              onChangeText={setLoginPassword}
              showSoftInputOnFocus={isAndroidLoginMode}
            />
            <Pressable onPress={() => setShowLoginPassword((current) => !current)}>
              <Text style={styles.passwordToggleText}>{showLoginPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              setPasswordResetEmail(loginEmail.trim());
              setPasswordResetVisible(true);
            }}
          >
            <Text style={styles.linkText}>Forgot password?</Text>
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
        <Modal
          visible={passwordResetVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPasswordResetVisible(false)}
        >
          <View style={styles.promptBackdrop}>
            <View style={styles.promptCard}>
              <Text style={styles.promptEyebrow}>Password reset</Text>
              <Text style={styles.promptTitle}>Reset your password</Text>
              <Text style={styles.promptCopy}>
                Enter the email address tied to your ChaufX driver account and we will send you a secure reset link.
              </Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
                value={passwordResetEmail}
                onChangeText={setPasswordResetEmail}
                showSoftInputOnFocus={isAndroidLoginMode}
              />
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.secondaryButton, styles.flexButton]}
                  onPress={() => setPasswordResetVisible(false)}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, styles.flexButton, passwordResetBusy && styles.buttonDisabled]}
                  disabled={passwordResetBusy}
                  onPress={handleRequestPasswordReset}
                >
                  {passwordResetBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Send link</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
      <Modal visible={Boolean(activeIncomingRequest)} transparent animationType="fade" onRequestClose={() => setActiveRequestPromptId(null)}>
        <View style={styles.promptBackdrop}>
          <View style={styles.promptCard}>
            <Text style={styles.promptEyebrow}>Incoming request</Text>
            {activeIncomingRequest ? (
              <>
                <View style={styles.tagRow}>
                  <Text style={[styles.bookingStatus, { color: toneColor(activeIncomingRequest.status) }]}>
                    {String(activeIncomingRequest.status).toUpperCase()}
                  </Text>
                  <Text style={styles.requestTypeChip}>{formatRequestType(activeIncomingRequest.requestType)}</Text>
                </View>
                <Text style={styles.promptTitle}>{activeIncomingRequest.pickupLocation}</Text>
                <Text style={styles.bookingCopy}>{activeIncomingRequest.destinationLocation}</Text>
                <Text style={styles.bookingMeta}>{formatDateTime(activeIncomingRequest.scheduledStartAt)}</Text>
                <Text style={styles.bookingMeta}>
                  Duration · {formatHours(activeIncomingRequest.expectedDurationMinutes)}
                </Text>
                {conflictingIncomingRequestIds.has(activeIncomingRequest.id) ? (
                  <Text style={styles.conflictText}>
                    This request overlaps with a trip you already accepted, so you cannot take both.
                  </Text>
                ) : null}
                <Text style={styles.promptCopy}>
                  A nearby trip is waiting. Accept now to reserve it or decline so another driver can take it.
                </Text>
                <View style={styles.actionRow}>
                  <Pressable
                    style={[
                      styles.primaryButton,
                      styles.flexButton,
                      (busy || conflictingIncomingRequestIds.has(activeIncomingRequest.id)) && styles.buttonDisabled
                    ]}
                    disabled={busy || conflictingIncomingRequestIds.has(activeIncomingRequest.id)}
                    onPress={() => decideRequest(activeIncomingRequest.id, "accept")}
                  >
                    <Text style={styles.primaryButtonText}>
                      {conflictingIncomingRequestIds.has(activeIncomingRequest.id) ? "Trip conflict" : "Accept"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, styles.flexButton, busy && styles.buttonDisabled]}
                    disabled={busy}
                    onPress={() => decideRequest(activeIncomingRequest.id, "reject")}
                  >
                    <Text style={styles.secondaryButtonText}>Decline</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal visible={Boolean(tripStartReminder)} transparent animationType="fade" onRequestClose={() => setTripStartReminder(null)}>
        <View style={styles.promptBackdrop}>
          <View style={styles.promptCard}>
            <Text style={styles.promptEyebrow}>Trip reminder</Text>
            {tripStartReminder ? (
              <>
                <Text style={styles.promptTitle}>{tripStartReminder.title}</Text>
                <Text style={styles.promptCopy}>{tripStartReminder.body}</Text>
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.primaryButton, styles.flexButton]}
                    onPress={() => {
                      setTab("home");
                      setTripStartReminder(null);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>View current trip</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, styles.flexButton]}
                    onPress={() => setTripStartReminder(null)}
                  >
                    <Text style={styles.secondaryButtonText}>Dismiss</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 10) + 12, paddingBottom: 34 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>Driver app</Text>
            <Text style={styles.headerTitle}>
              <Text style={styles.headerGreeting}>Hello </Text>
              <Text style={styles.headerTitleName}>{driverProfile?.user?.fullName?.split(" ")[0] ?? "driver"}</Text>
            </Text>
          </View>
          <Pressable style={styles.ghostButton} onPress={refreshDashboard}>
            <Text style={styles.ghostButtonText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
          </Pressable>
        </View>

        <View style={styles.mapCard} pointerEvents="box-none">
          <View style={styles.mapFrame} pointerEvents="none">
            <DriverMap
              driverCoordinate={driverCoordinate}
              pickupCoordinate={pickupCoordinate}
              destinationCoordinate={destinationCoordinate}
            />
          </View>
          <View style={styles.mapLegend}>
            <View style={styles.mapLegendPill}>
              <View style={[styles.legendPulse, { backgroundColor: "#EA580C" }]} />
              <Text style={styles.mapLegendText}>Pickup</Text>
            </View>
            <View style={styles.mapLegendPill}>
              <View style={[styles.legendDiamond, { backgroundColor: "#2563EB" }]} />
              <Text style={styles.mapLegendText}>Dropoff</Text>
            </View>
          </View>
        </View>

        {currentTrip ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Current trip</Text>
            <View style={styles.tagRow}>
              <Text style={styles.requestTypeChip}>{formatRequestType(currentTrip.requestType)}</Text>
              <Text style={[styles.bookingStatus, { color: toneColor(currentTrip.status) }]}>
                {String(currentTrip.status).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.tripStageLabel}>{getOperationLabel(currentTrip.status)}</Text>
            <Text style={styles.bookingTitle}>{currentTrip.pickupLocation}</Text>
            <Text style={styles.bookingCopy}>{currentTrip.destinationLocation}</Text>
            <Text style={styles.bookingMeta}>{formatDateTime(currentTrip.scheduledStartAt)}</Text>
            <Text style={styles.bookingMeta}>{formatStartsIn(currentTrip.scheduledStartAt)}</Text>
            <Text style={styles.bookingMeta}>Duration · {formatHours(currentTrip.expectedDurationMinutes)}</Text>
            {currentTripAction?.helper ? (
              <View style={styles.infoStrip}>
                <Text style={styles.infoStripText}>{currentTripAction.helper}</Text>
              </View>
            ) : null}
            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.primaryButton,
                  styles.flexButton,
                  (busy || currentTripAction?.disabled) && styles.buttonDisabled
                ]}
                disabled={busy || Boolean(currentTripAction?.disabled) || !currentTripAction?.action}
                onPress={() => currentTripAction?.action && handleTripAction(currentTripAction.action)}
              >
                <Text style={styles.primaryButtonText}>{currentTripAction?.label ?? "Next step"}</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, styles.flexButton]} onPress={refreshDashboard}>
                <Text style={styles.secondaryButtonText}>Refresh trip</Text>
              </Pressable>
            </View>
            {String(currentTrip.status).toLowerCase() === "enroute" ? (
              <Pressable
                style={[styles.secondaryButton, (busy || arrivalNoticeBookingId === currentTrip.id) && styles.buttonDisabled]}
                disabled={busy || arrivalNoticeBookingId === currentTrip.id}
                onPress={handleNotifyArrival}
              >
                <Text style={styles.secondaryButtonText}>
                  {arrivalNoticeBookingId === currentTrip.id ? "Sending arrival..." : "Notify customer I arrived"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.tabRow}>
          {[
            ["home", "Home"],
            ["account", "Account"]
          ].map(([key, label]) => (
            <Pressable key={key} style={[styles.tabButton, tab === key && styles.tabButtonActive]} onPress={() => setTab(key as Tab)}>
              <Text style={[styles.tabButtonText, tab === key && styles.tabButtonTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "home" ? (
          <>
            <View style={styles.panel}>
              <View style={styles.availabilityRow}>
                <View style={styles.availabilityCopy}>
                  <Text style={styles.panelTitle}>Availability</Text>
                  <Text style={styles.subtleText}>
                    {driverProfile?.availabilityStatus ? "You are available for nearby routed requests." : "Go online to receive requests."}
                  </Text>
                </View>
                <View style={styles.availabilityToggleWrap}>
                  <Switch
                    value={Boolean(driverProfile?.availabilityStatus)}
                    onValueChange={toggleAvailability}
                    trackColor={{ false: "#CBD5E1", true: "#22C55E" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Live updates</Text>
              {visibleLiveUpdates.length ? (
                visibleLiveUpdates.map((item) => (
                  <View key={item.id} style={styles.bookingCard}>
                    {item.type === "LOCAL_DRIVER_REMINDER" ? (
                      <View style={styles.tagRow}>
                        <Text style={styles.reminderBadge}>Reminder</Text>
                      </View>
                    ) : null}
                    <Text style={styles.bookingStatus}>{item.title}</Text>
                    <Text style={styles.bookingCopy}>{item.body}</Text>
                    <Text style={styles.bookingMeta}>{formatDateTime(item.createdAt)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Trip and request updates will appear here as your day moves.</Text>
              )}
            </View>

            {reminderTrips.length ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Coming up</Text>
                {reminderTrips.map((booking) => (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.tagRow}>
                      <Text style={styles.requestTypeChip}>{formatRequestType(booking.requestType)}</Text>
                      <Text style={styles.bookingStatus}>{formatStartsIn(booking.scheduledStartAt)}</Text>
                    </View>
                    <Text style={styles.bookingTitle}>{booking.pickupLocation}</Text>
                    <Text style={styles.bookingCopy}>{booking.destinationLocation}</Text>
                    <Text style={styles.bookingMeta}>{formatDateTime(booking.scheduledStartAt)}</Text>
                    <Text style={styles.bookingMeta}>Duration · {formatHours(booking.expectedDurationMinutes)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Scheduled trips</Text>
              {scheduledTrips.length ? (
                scheduledTrips.map((booking) => (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.tagRow}>
                      <Text style={[styles.bookingStatus, { color: toneColor(booking.status) }]}>{String(booking.status).toUpperCase()}</Text>
                      <Text style={styles.requestTypeChip}>{formatRequestType(booking.requestType)}</Text>
                    </View>
                    <Text style={styles.bookingTitle}>{booking.pickupLocation}</Text>
                    <Text style={styles.bookingCopy}>{booking.destinationLocation}</Text>
                    <Text style={styles.bookingMeta}>{formatDateTime(booking.scheduledStartAt)}</Text>
                    <Text style={styles.bookingMeta}>{formatStartsIn(booking.scheduledStartAt)}</Text>
                    <Text style={styles.bookingMeta}>Duration · {formatHours(booking.expectedDurationMinutes)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No future scheduled trips yet.</Text>
              )}
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Incoming requests</Text>
              {incomingRequests.length ? (
                incomingRequests.map((booking) => (
                  <View key={booking.id} style={styles.bookingCard}>
                    <View style={styles.tagRow}>
                      <Text style={[styles.bookingStatus, { color: toneColor(booking.status) }]}>{String(booking.status).toUpperCase()}</Text>
                      <Text style={styles.requestTypeChip}>{formatRequestType(booking.requestType)}</Text>
                    </View>
                    <Text style={styles.bookingTitle}>{booking.pickupLocation}</Text>
                    <Text style={styles.bookingCopy}>{booking.destinationLocation}</Text>
                    <Text style={styles.bookingMeta}>{formatDateTime(booking.scheduledStartAt)}</Text>
                    <Text style={styles.bookingMeta}>{formatStartsIn(booking.scheduledStartAt)}</Text>
                    <Text style={styles.bookingMeta}>Duration · {formatHours(booking.expectedDurationMinutes)}</Text>
                    {conflictingIncomingRequestIds.has(booking.id) ? (
                      <Text style={styles.conflictText}>
                        Conflicts with another accepted trip on your schedule.
                      </Text>
                    ) : null}
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[
                          styles.primaryButton,
                          styles.flexButton,
                          (busy || conflictingIncomingRequestIds.has(booking.id)) && styles.buttonDisabled
                        ]}
                        disabled={busy || conflictingIncomingRequestIds.has(booking.id)}
                        onPress={() => decideRequest(booking.id, "accept")}
                      >
                        <Text style={styles.primaryButtonText}>
                          {conflictingIncomingRequestIds.has(booking.id) ? "Trip conflict" : "Accept"}
                        </Text>
                      </Pressable>
                      <Pressable style={[styles.secondaryButton, styles.flexButton]} onPress={() => decideRequest(booking.id, "reject")}>
                        <Text style={styles.secondaryButtonText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No nearby requests are waiting for you right now.</Text>
              )}
            </View>
          </>
        ) : null}

        {tab === "account" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Account</Text>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Driver</Text>
              <Text style={styles.accountValue}>{driverProfile?.user?.fullName ?? session.user.fullName}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Email</Text>
              <Text style={styles.accountValue}>{driverProfile?.user?.email ?? session.user.email}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Province</Text>
              <Text style={styles.accountValue}>{getDriverProvince(driverProfile)}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Average rating</Text>
              <Text style={styles.accountValue}>{formatDriverAverageRating(driverProfile)}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={styles.accountLabel}>Reviews</Text>
              <Text style={styles.accountValue}>{formatDriverRatingCount(driverProfile)}</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={logout}>
              <Text style={styles.secondaryButtonText}>Log out</Text>
            </Pressable>
          </View>
        ) : null}

        {status ? <Text style={styles.statusText}>{status}</Text> : null}
      </ScrollView>
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
    padding: 24,
    gap: 14
  },
  loginPanelCompact: {
    padding: 16,
    gap: 8
  },
  loginPanelAndroid: {
    marginTop: 48
  },
  loginLogo: {
    width: 112,
    height: 112,
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
    fontWeight: "700"
  },
  loginEyebrowCompact: {
    fontSize: 10,
    letterSpacing: 2.1
  },
  loginTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center"
  },
  loginTitleCompact: {
    fontSize: 18
  },
  loginCopy: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  loginCard: {
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    padding: 16,
    gap: 12
  },
  loginCardCompact: {
    padding: 14,
    gap: 8
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
    marginTop: 4
  },
  headerGreeting: {
    fontWeight: "500"
  },
  headerTitleName: {
    fontWeight: "700"
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
    height: 320,
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
  promptBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8,25,48,0.68)",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  promptCard: {
    borderRadius: 28,
    backgroundColor: "#F8FAFC",
    padding: 20,
    gap: 10
  },
  promptEyebrow: {
    color: "#2563EB",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "800"
  },
  promptTitle: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800"
  },
  promptCopy: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21
  },
  conflictText: {
    color: "#B45309",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600"
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
    gap: 8
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
  subtleText: {
    color: "#64748B",
    marginTop: 6,
    lineHeight: 20
  },
  helperText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  availabilityCopy: {
    flex: 1,
    minWidth: 0
  },
  availabilityToggleWrap: {
    width: 56,
    alignItems: "flex-end",
    justifyContent: "center"
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
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: "#4338CA",
    fontWeight: "700"
  },
  flexButton: {
    flex: 1
  },
  buttonDisabled: {
    opacity: 0.6
  },
  bookingCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 6
  },
  tagRow: {
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
  reminderBadge: {
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    color: "#B45309",
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
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
  tripStageLabel: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "700"
  },
  infoStrip: {
    borderRadius: 16,
    backgroundColor: "#0F172A",
    padding: 14
  },
  infoStripText: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 19
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8
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
  statusText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  linkText: {
    color: "#2563EB",
    fontWeight: "700"
  }
});
