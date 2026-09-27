"use client";

import { useEffect } from "react";
import { clearStoredWebSessions, hasStoredWebSession, webSessionChangeEvent } from "../lib/api";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = "chaufx_web_last_activity_at";

export function SessionIdleGuard() {
  useEffect(() => {
    let timeoutId: number | undefined;

    const readLastActivity = () => {
      const storedValue = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(storedValue) && storedValue > 0 ? storedValue : Date.now();
    };

    const writeLastActivity = (value = Date.now()) => {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(value));
      return value;
    };

    const clearTimer = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const expireSession = () => {
      window.localStorage.removeItem(LAST_ACTIVITY_KEY);
      clearStoredWebSessions();
      window.location.assign("/login");
    };

    const armIdleTimer = () => {
      clearTimer();
      if (!hasStoredWebSession()) {
        window.localStorage.removeItem(LAST_ACTIVITY_KEY);
        return;
      }

      const remainingTime = IDLE_TIMEOUT_MS - (Date.now() - readLastActivity());
      if (remainingTime <= 0) {
        expireSession();
        return;
      }

      timeoutId = window.setTimeout(expireSession, remainingTime);
    };

    const recordActivity = () => {
      if (!hasStoredWebSession()) {
        clearTimer();
        return;
      }

      if (Date.now() - readLastActivity() >= IDLE_TIMEOUT_MS) {
        expireSession();
        return;
      }

      writeLastActivity();
      armIdleTimer();
    };

    const handleSessionChange = () => {
      if (hasStoredWebSession()) {
        writeLastActivity();
      }
      armIdleTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        armIdleTimer();
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
    window.addEventListener(webSessionChangeEvent, handleSessionChange);
    window.addEventListener("storage", armIdleTimer);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    armIdleTimer();

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener(webSessionChangeEvent, handleSessionChange);
      window.removeEventListener("storage", armIdleTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
