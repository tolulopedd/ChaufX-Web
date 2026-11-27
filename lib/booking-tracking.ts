export type BookingTrackingProperties = {
  content_name: "booking_form";
  duration_hours?: number;
  service_province?: string;
  value?: number;
  currency?: "CAD";
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (
      action: "track" | "trackCustom",
      eventName: string,
      parameters?: Record<string, unknown>
    ) => void;
  }
}

const bookingFormStartedKey = "chx_booking_form_started";

function readSession(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Tracking remains available when browser storage is unavailable.
  }
}

/**
 * Emits a privacy-safe booking event to GTM and, when the existing standalone
 * Meta base pixel is present, to that pixel. This does not install another Pixel.
 */
export function trackBookingEvent(
  eventName: "BookingFormStarted" | "FareEstimated" | "BookingSubmitAttempted" | "Lead",
  properties: BookingTrackingProperties
) {
  if (typeof window === "undefined") return;

  window.dataLayer?.push({ event: eventName, ...properties });
  if (typeof window.fbq !== "function") return;

  if (eventName === "Lead") window.fbq("track", "Lead", properties);
  else window.fbq("trackCustom", eventName, properties);
}

export function trackBookingFormStarted(properties: BookingTrackingProperties) {
  if (typeof window === "undefined" || readSession(bookingFormStartedKey)) return;
  writeSession(bookingFormStartedKey);
  trackBookingEvent("BookingFormStarted", properties);
}

/** For existing GTM/GA4 events that are not Meta conversion events. */
export function trackDataLayerEvent(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") window.dataLayer?.push({ event, ...properties });
}
