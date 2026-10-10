"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://chaufx-backend.onrender.com/api";
const TOKEN_KEY = "chaufx_admin_token";
const WEB_ROLE_KEY = "chaufx_web_role";
const DRIVER_TOKEN_KEY = "chaufx_driver_web_token";
const CUSTOMER_TOKEN_KEY = "chaufx_customer_web_token";
const ADMIN_REFRESH_TOKEN_KEY = "chaufx_admin_refresh_token";
const DRIVER_REFRESH_TOKEN_KEY = "chaufx_driver_web_refresh_token";
const CUSTOMER_REFRESH_TOKEN_KEY = "chaufx_customer_web_refresh_token";
const SESSION_CHANGE_EVENT = "chaufx-session-change";

type WebSessionScope = "admin" | "driver" | "customer";

type AuthSession = {
  accessToken: string;
  refreshToken: string;
};

const refreshPromises: Partial<Record<WebSessionScope, Promise<string>>> = {};

function notifySessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setStoredToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearStoredToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
  }
}

function getRefreshTokenKey(scope: WebSessionScope) {
  if (scope === "admin") {
    return ADMIN_REFRESH_TOKEN_KEY;
  }

  return scope === "driver" ? DRIVER_REFRESH_TOKEN_KEY : CUSTOMER_REFRESH_TOKEN_KEY;
}

function getStoredRefreshToken(scope: WebSessionScope) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getRefreshTokenKey(scope)) ?? "";
}

function setStoredRefreshToken(scope: WebSessionScope, token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getRefreshTokenKey(scope), token);
  }
}

function clearStoredRefreshToken(scope: WebSessionScope) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(getRefreshTokenKey(scope));
  }
}

function storeWebSession(scope: WebSessionScope, session: AuthSession, notify = true) {
  if (scope === "admin") {
    setStoredToken(session.accessToken);
  } else if (scope === "driver") {
    setStoredDriverToken(session.accessToken);
  } else {
    setStoredCustomerToken(session.accessToken);
  }

  setStoredRefreshToken(scope, session.refreshToken);
  if (notify) {
    notifySessionChange();
  }
}

function clearWebSession(scope: WebSessionScope) {
  if (scope === "admin") {
    clearStoredToken();
  } else if (scope === "driver") {
    clearStoredDriverToken();
  } else {
    clearStoredCustomerToken();
  }

  clearStoredRefreshToken(scope);
  notifySessionChange();
}

export function setStoredAdminSession(session: AuthSession) {
  storeWebSession("admin", session);
}

export function setStoredDriverSession(session: AuthSession) {
  storeWebSession("driver", session);
}

export function setStoredCustomerSession(session: AuthSession) {
  storeWebSession("customer", session);
}

export function clearStoredWebSessions() {
  clearWebSession("admin");
  clearWebSession("driver");
  clearWebSession("customer");
  clearStoredWebRole();
}

export function hasStoredWebSession() {
  return Boolean(getStoredToken() || getStoredDriverToken() || getStoredCustomerToken());
}

export const webSessionChangeEvent = SESSION_CHANGE_EVENT;

export function getStoredWebRole() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(WEB_ROLE_KEY) ?? "";
}

export function setStoredWebRole(role: "admin" | "marketing") {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(WEB_ROLE_KEY, role);
  }
}

export function clearStoredWebRole() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(WEB_ROLE_KEY);
  }
}

export function getStoredDriverToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(DRIVER_TOKEN_KEY) ?? "";
}

export function setStoredDriverToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DRIVER_TOKEN_KEY, token);
  }
}

export function clearStoredDriverToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DRIVER_TOKEN_KEY);
    window.localStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);
  }
}

export function getStoredCustomerToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(CUSTOMER_TOKEN_KEY) ?? "";
}

export function setStoredCustomerToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  }
}

export function clearStoredCustomerToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    window.localStorage.removeItem(CUSTOMER_REFRESH_TOKEN_KEY);
  }
}

function handleAdminAuthFailure() {
  expireWebSession("admin");
}

function handleCustomerAuthFailure() {
  expireWebSession("customer");
}

function expireWebSession(scope: WebSessionScope) {
  clearWebSession(scope);
  if (scope === "admin") {
    clearStoredWebRole();
  }

  if (typeof window !== "undefined") {
    // A full replacement prevents the expired page from remaining in history.
    window.location.replace("/login");
  }
}

function getStoredAccessToken(scope: WebSessionScope) {
  if (scope === "admin") {
    return getStoredToken();
  }

  return scope === "driver" ? getStoredDriverToken() : getStoredCustomerToken();
}

async function refreshWebSession(scope: WebSessionScope) {
  const existingRefresh = refreshPromises[scope];
  if (existingRefresh) {
    return existingRefresh;
  }

  const refreshPromise = (async () => {
  const refreshToken = getStoredRefreshToken(scope);
  if (!refreshToken) {
    throw new Error("Refresh session is unavailable");
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.accessToken || !payload?.refreshToken) {
    throw new Error(payload?.error?.message ?? "Unable to refresh session");
  }

  storeWebSession(scope, payload as AuthSession, false);
  return payload.accessToken as string;
  })();

  refreshPromises[scope] = refreshPromise;

  try {
    return await refreshPromise;
  } finally {
    delete refreshPromises[scope];
  }
}

async function authenticatedWebFetch(scope: WebSessionScope, path: string, options?: RequestInit) {
  const send = (token: string) =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options?.headers ?? {})
      }
    });

  let response = await send(getStoredAccessToken(scope));
  if (response.status === 401) {
    try {
      response = await send(await refreshWebSession(scope));
    } catch {
      expireWebSession(scope);
      throw new Error("Session expired. Please sign in again.");
    }
  }

  return response;
}

export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Login failed");
  }

  storeWebSession("admin", payload);
  if (payload.user?.role === "admin" || payload.user?.role === "marketing") {
    setStoredWebRole(payload.user.role);
  }
  return payload;
}

export async function webLogin(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Login failed");
  }

  return payload;
}

export async function registerCustomerWeb(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const response = await fetch(`${API_BASE}/auth/register/customer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to create account");
  }

  return data;
}

export async function requestCustomerVerificationEmail(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  referralCode?: string;
}) {
  const response = await fetch(`${API_BASE}/auth/verify-email/request/customer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to send verification email");
  }

  return data as { message: string; previewUrl?: string };
}

export async function requestDriverOnboardingVerificationEmail(payload: {
  firstName: string;
  lastName: string;
  email: string;
  referralCode?: string;
}) {
  const response = await fetch(`${API_BASE}/auth/verify-email/request/driver-onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to send verification email");
  }

  return data as { message: string; previewUrl?: string };
}

export async function confirmWebsiteEmailVerification(token: string) {
  const response = await fetch(`${API_BASE}/auth/verify-email/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to verify email");
  }

  return data as {
    purpose: "CUSTOMER_SIGNUP" | "DRIVER_ONBOARDING";
    email: string;
    payload?: Record<string, string | null>;
  };
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to request password reset");
  }

  return data as { message: string; previewUrl?: string };
}

export async function validatePasswordResetToken(token: string) {
  const response = await fetch(`${API_BASE}/auth/reset-password/validate?token=${encodeURIComponent(token)}`, {
    cache: "no-store"
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to validate password reset link");
  }

  return data as { email: string; fullName: string };
}

export async function confirmPasswordReset(payload: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  const response = await fetch(`${API_BASE}/auth/reset-password/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to update password");
  }

  return data as { message: string; email: string };
}

export async function driverApply(payload: unknown) {
  const response = await fetch(`${API_BASE}/driver-onboarding/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to submit application");
  }

  return data;
}

export async function fetchDriverAbstractSubmission(token: string) {
  const response = await fetch(`${API_BASE}/driver-onboarding/driver-abstract?token=${encodeURIComponent(token)}`, {
    cache: "no-store"
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to load the driver abstract step.");
  }

  return data as { id: string; fullName: string; email: string; status: string };
}

export async function submitDriverAbstractForReview(token: string) {
  const response = await fetch(`${API_BASE}/driver-onboarding/driver-abstract/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, confirmed: true })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to submit the driver abstract for review.");
  }

  return data;
}

export async function fetchDriverApplicationUpdate(token: string) {
  const response = await fetch(`${API_BASE}/driver-onboarding/application-update?token=${encodeURIComponent(token)}`, {
    cache: "no-store"
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to load application update");
  }

  return data as {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    licenseNumber: string;
    yearsOfExperience: number;
    preferredServiceAreas: string[];
    availabilitySchedule: string | null;
    reviewNote: string | null;
    documents: Array<{ id: string; fileName: string; type: string }>;
  };
}

export async function fetchApplicationStatus(email: string) {
  const response = await fetch(`${API_BASE}/driver-onboarding/status?email=${encodeURIComponent(email)}`, {
    cache: "no-store"
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to fetch status");
  }

  return data;
}

export async function driverLogin(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to sign in");
  }

  return data;
}

export async function fetchDriverProfile(_token: string) {
  const response = await authenticatedWebFetch("driver", "/drivers/me", {
    cache: "no-store"
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to fetch driver profile");
  }

  return data;
}

export async function customerFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedWebFetch("customer", path, options);

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      handleCustomerAuthFailure();
      throw new Error("Session expired. Redirecting to login...");
    }

    throw new Error(payload?.error?.message ?? "Request failed");
  }

  return payload as T;
}

export async function submitContactMessage(payload: {
  fullName: string;
  email: string;
  province?: string;
  subject?: string;
  message: string;
  source?: string;
}) {
  const response = await fetch(`${API_BASE}/contact-messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...payload,
      source: payload.source ?? "website"
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to send message");
  }

  return data;
}

export async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedWebFetch("admin", path, {
    cache: "no-store",
    ...options
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      handleAdminAuthFailure();
      throw new Error("Session expired. Redirecting to login...");
    }

    throw new Error(payload?.error?.message ?? "Request failed");
  }

  return payload as T;
}

export async function createReferralPartner(payload: {
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  code?: string;
  status?: "ACTIVE" | "INACTIVE";
}) {
  return adminFetch("/admin/referral-partners", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateReferralPartner(
  partnerId: string,
  payload: Partial<{
    name: string;
    contactName: string;
    email: string;
    phone: string | null;
    code: string;
    status: "ACTIVE" | "INACTIVE";
  }>
) {
  return adminFetch(`/admin/referral-partners/${partnerId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function updateSettlementStatus(
  driverId: string,
  weekStart: string,
  payload: {
    status: "PENDING" | "PAID";
    payoutReference?: string | null;
    notes?: string | null;
  }
) {
  return adminFetch<{
    settlement: {
      id: string;
      driverId: string;
      driverName: string;
      status: "PENDING" | "PAID";
      weekStart: string;
      weekEnd: string;
      tripCount: number;
      grossAmount: number;
      platformShareAmount: number;
      driverShareAmount: number;
      paidAt: string | null;
      payoutReference: string | null;
      notes: string | null;
    };
  }>(`/admin/settlements/${driverId}/${weekStart}/status`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminUser(
  userId: string,
  payload: {
    fullName: string;
    email: string;
    phone?: string;
    role: "CUSTOMER" | "DRIVER" | "ADMIN" | "MARKETING";
    status: "ACTIVE" | "DISABLED" | "PENDING_APPROVAL";
    membershipTier?: "BASIC" | "PLUS" | "CONCIERGE" | "CORPORATE";
    membershipStatus?: "ACTIVE" | "AWAITING_PAYMENT" | "CANCELLED" | "EXPIRED";
    membershipBillingCycle?: "NONE" | "MONTHLY" | "ANNUAL" | "CUSTOM";
    membershipHourlyRate?: number | null;
    savedAddresses?: string[];
    driver?: {
      licenseNumber: string;
      yearsOfExperience: number;
      emergencyContact: string;
      serviceAreas: string[];
      availabilitySchedule?: string | null;
      availabilityStatus: boolean;
    };
  }
) {
  return adminFetch<any>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function createAdminUser(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: "CUSTOMER" | "DRIVER" | "ADMIN" | "MARKETING";
  status: "ACTIVE" | "DISABLED" | "PENDING_APPROVAL";
}) {
  return adminFetch<any>("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminUser(userId: string) {
  return adminFetch<void>(`/admin/users/${userId}`, {
    method: "DELETE"
  });
}

export async function resetAdminManagedUserPassword(userId: string, newPassword: string) {
  return adminFetch<{ success: true }>(`/admin/users/${userId}/password`, {
    method: "POST",
    body: JSON.stringify({
      newPassword
    })
  });
}

export async function resendDriverPasswordLink(userId: string) {
  return adminFetch<{ success: true }>(`/admin/users/${userId}/resend-driver-password-link`, {
    method: "POST"
  });
}

export async function fetchAdminDocumentLink(documentId: string) {
  const response = await authenticatedWebFetch("admin", `/admin/documents/${documentId}/link`);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      handleAdminAuthFailure();
      throw new Error("Session expired. Redirecting to login...");
    }

    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Unable to open document");
  }

  return (await response.json()) as {
    url: string;
    fileName: string;
    mimeType?: string | null;
  };
}

export function useAdminResource<T>(path: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    adminFetch<T>(path)
      .then((result) => {
        if (!mounted) {
          return;
        }
        setData(result);
        setError("");
      })
      .catch((reason: Error) => {
        if (!mounted) {
          return;
        }
        setError(reason.message);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [path]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      reload: async () => {
        setLoading(true);
        const result = await adminFetch<T>(path);
        setData(result);
        setLoading(false);
      }
    }),
    [data, error, loading, path]
  );
}

export function useCustomerResource<T>(path: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    customerFetch<T>(path)
      .then((result) => {
        if (!mounted) {
          return;
        }
        setData(result);
        setError("");
      })
      .catch((reason: Error) => {
        if (!mounted) {
          return;
        }
        setError(reason.message);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [path]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      reload: async () => {
        setLoading(true);
        const result = await customerFetch<T>(path);
        setData(result);
        setLoading(false);
      }
    }),
    [data, error, loading, path]
  );
}

export const dashboardFallback = {
  metrics: {
    totalUsers: 0,
    totalDrivers: 0,
    pendingApplications: 0,
    activeBookings: 0,
    revenue: 0
  },
  activeTrips: []
};

export const contactMessagesFallback: Array<{
  id: string;
  fullName: string;
  email: string;
  province?: string | null;
  subject?: string | null;
  message: string;
  source: string;
  status: "NEW" | "RESOLVED";
  resolvedAt?: string | null;
  resolvedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}> = [];
