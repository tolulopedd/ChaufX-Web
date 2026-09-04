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

async function requestAtBase<T>(base: string, path: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
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

async function request<T>(path: string, options?: RequestInit) {
  const candidates = resolvedApiBase ? [resolvedApiBase, ...getCandidateApiBases()] : getCandidateApiBases();
  const uniqueCandidates = Array.from(new Set(candidates));
  let lastError: unknown = null;

  for (const base of uniqueCandidates) {
    try {
      return await requestAtBase<T>(base, path, options);
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

  throw new Error(
    __DEV__
      ? "Unable to reach the ChaufX API. Start the local API on port 4000 or confirm EXPO_PUBLIC_API_URL is correct."
      : "Unable to reach the ChaufX API."
  );
}

export type Session = {
  accessToken: string;
  user: {
    id: string;
    role: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
};

export type TripMessage = {
  id: string;
  bookingId: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    role: string;
    fullName: string;
  };
};

export function login(email: string, password: string) {
  return request<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, expectedApp: "customer" })
  });
}

export function requestCustomerVerificationEmail(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  return request<{ message: string; previewUrl?: string }>("/auth/verify-email/request/customer", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function requestPasswordReset(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export type CustomerProfileUpdate = {
  phone?: string;
  dateOfBirth?: string;
  primaryAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vehicle?: {
    make: string;
    model: string;
    plateNumber: string;
    registrationProvince: string;
  };
  vehicleComplianceConfirmed?: boolean;
  termsAccepted?: boolean;
  privacyPolicyAccepted?: boolean;
  identityVerificationConsented?: boolean;
  vehicleAuthorityConfirmed?: boolean;
  governmentPhotoId?: {
    fileName: string;
    fileUrl: string;
    mimeType?: string;
  };
};

export function updateCustomerProfile(token: string, payload: CustomerProfileUpdate) {
  return request<any>("/users/me/customer-profile", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function fetchBookings(token: string) {
  return request<any[]>("/bookings", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function fetchNotifications(token: string) {
  return request<any[]>("/notifications", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function fetchProfile(token: string) {
  return request<any>("/users/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createBooking(token: string, payload: Record<string, unknown>) {
  return request<any>("/bookings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function createCheckoutSession(token: string, bookingId: string, payload: Record<string, unknown>) {
  return request<any>(`/payments/${bookingId}/checkout-session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function syncBookingPayment(token: string, bookingId: string) {
  return request<any>(`/payments/${bookingId}/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
}

export function fetchBookingEstimate(token: string, payload: Record<string, unknown>) {
  return request<any>("/bookings/estimate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function cancelBooking(token: string, bookingId: string) {
  return request<any>(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function fetchMapState(token: string, bookingId: string) {
  return request<any>(`/trips/${bookingId}/map-state`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function fetchTripMessages(token: string, bookingId: string) {
  return request<TripMessage[]>(`/bookings/${bookingId}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function sendTripMessage(token: string, bookingId: string, body: string) {
  return request<TripMessage>(`/bookings/${bookingId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ body })
  });
}

export function submitRating(token: string, bookingId: string, score: number, comment: string) {
  return request<any>(`/bookings/${bookingId}/rating`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ score, comment })
  });
}
