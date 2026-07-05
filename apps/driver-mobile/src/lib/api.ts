import { Platform } from "react-native";
import Constants from "expo-constants";
import { buildMobileApiBaseCandidates } from "@chaufx/config";

let resolvedApiBase: string | null = null;
const REQUEST_TIMEOUT_MS = 15000;

function isFinalApiError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const status = (error as Error & { status?: number }).status;
  return typeof status === "number" && status >= 400 && status < 500;
}

function getCandidateApiBases() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ??
    (Constants as any).manifest?.debuggerHost;

  return buildMobileApiBaseCandidates({
    envApiUrl: process.env.EXPO_PUBLIC_API_URL,
    hostUri,
    isDev: __DEV__,
    isDevice: Constants.isDevice,
    platform: Platform.OS === "android" ? "android" : "ios",
    preferRemote: process.env.EXPO_PUBLIC_API_PREFER_REMOTE === "true"
  });
}

async function parseResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { error: { message: text } } : {};
}

function toApiError(response: Response, payload: any) {
  const message =
    payload?.error?.message ??
    (response.status === 401 ? "Session expired. Please sign in again." : "Request failed");

  const error = new Error(message) as Error & { status?: number; code?: string };
  error.status = response.status;
  error.code = payload?.error?.code;
  return error;
}

async function requestAtBase<T>(base: string, path: string, token: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {})
      }
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      throw toApiError(response, payload);
    }

    resolvedApiBase = base;
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The server took too long to respond. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function request<T>(path: string, token: string, options?: RequestInit) {
  const candidates = resolvedApiBase ? [resolvedApiBase, ...getCandidateApiBases()] : getCandidateApiBases();
  const uniqueCandidates = Array.from(new Set(candidates));
  let lastError: unknown = null;

  for (const base of uniqueCandidates) {
    try {
      return await requestAtBase<T>(base, path, token, options);
    } catch (error) {
      if (isFinalApiError(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Unable to reach the ChaufX API.");
}

export function login(email: string, password: string) {
  const candidates = resolvedApiBase ? [resolvedApiBase, ...getCandidateApiBases()] : getCandidateApiBases();
  const uniqueCandidates = Array.from(new Set(candidates));

  return (async () => {
    let lastError: unknown = null;

    for (const base of uniqueCandidates) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${base}/auth/login`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw toApiError(response, payload);
        }
        resolvedApiBase = base;
        return payload;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error("The server took too long to respond. Please try again.");
          continue;
        }

        if (isFinalApiError(error)) {
          throw error;
        }

        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error(
      __DEV__
        ? "Unable to reach the ChaufX API. Start the local API on port 4000 or confirm EXPO_PUBLIC_API_URL is correct."
        : "Unable to reach the ChaufX API."
    );
  })();
}

export function requestPasswordReset(email: string) {
  const candidates = resolvedApiBase ? [resolvedApiBase, ...getCandidateApiBases()] : getCandidateApiBases();
  const uniqueCandidates = Array.from(new Set(candidates));

  return (async () => {
    let lastError: unknown = null;

    for (const base of uniqueCandidates) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${base}/auth/forgot-password`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        });
        const payload = await parseResponsePayload(response);
        if (!response.ok) {
          throw toApiError(response, payload);
        }
        resolvedApiBase = base;
        return payload as { message: string };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error("The server took too long to respond. Please try again.");
          continue;
        }

        if (isFinalApiError(error)) {
          throw error;
        }

        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error(
      __DEV__
        ? "Unable to reach the ChaufX API. Start the local API on port 4000 or confirm EXPO_PUBLIC_API_URL is correct."
        : "Unable to reach the ChaufX API."
    );
  })();
}

export function fetchDriverProfile(token: string) {
  return request<any>("/drivers/me", token);
}

export function fetchBookings(token: string) {
  return request<any[]>("/bookings", token);
}

export function fetchNotifications(token: string) {
  return request<any[]>("/notifications", token);
}

export function registerPushDevice(
  token: string,
  payload: {
    expoPushToken: string;
    platform: "ios" | "android";
    appVariant: "customer" | "driver";
  }
) {
  return request<any>("/notifications/devices", token, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function markNotificationRead(token: string, notificationId: string) {
  return request<{ success: boolean }>(`/notifications/${notificationId}/read`, token, {
    method: "POST"
  });
}

export function setAvailability(token: string, availabilityStatus: boolean) {
  return request<any>("/drivers/me/availability", token, {
    method: "PATCH",
    body: JSON.stringify({ availabilityStatus })
  });
}

export function updateDriverLocation(token: string, latitude: number, longitude: number, zoneCode?: string) {
  return request<any>("/drivers/me/location", token, {
    method: "PATCH",
    body: JSON.stringify({
      latitude,
      longitude,
      zoneCode
    })
  });
}

export function acceptBooking(token: string, bookingId: string) {
  return request<any>(`/bookings/${bookingId}/accept`, token, {
    method: "POST"
  });
}

export function rejectBooking(token: string, bookingId: string) {
  return request<any>(`/bookings/${bookingId}/reject`, token, {
    method: "POST"
  });
}

export function startTrip(token: string, bookingId: string) {
  return request<any>(`/trips/${bookingId}/start`, token, {
    method: "POST"
  });
}

export function markTripEnRoute(token: string, bookingId: string) {
  return request<any>(`/trips/${bookingId}/enroute`, token, {
    method: "POST"
  });
}

export function notifyTripArrival(token: string, bookingId: string) {
  return request<{ success: boolean }>(`/trips/${bookingId}/arrived`, token, {
    method: "POST"
  });
}

export function endTrip(token: string, bookingId: string) {
  return request<any>(`/trips/${bookingId}/end`, token, {
    method: "POST"
  });
}

export function fetchMapState(token: string, bookingId: string) {
  return request<any>(`/trips/${bookingId}/map-state?_=${Date.now()}`, token);
}

export function shareLocation(
  token: string,
  bookingId: string,
  latitude: number,
  longitude: number,
  heading?: number | null,
  speedKph?: number | null
) {
  return request<any>("/locations", token, {
    method: "POST",
    body: JSON.stringify({
      bookingId,
      latitude,
      longitude,
      heading: typeof heading === "number" ? heading : undefined,
      speedKph: typeof speedKph === "number" ? speedKph : undefined
    })
  });
}
