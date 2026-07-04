export const appConfig = {
  brandName: "ChaufX",
  tripActivationMinutesBeforeStart: 15,
  tripCompletionGraceMinutes: 30,
  defaultCurrency: "CAD",
  driverLocationFreshnessMinutes: 30,
  driverDispatchFanout: 5
} as const;

export type ActivationWindow = {
  startsAt: Date;
  endsAt: Date;
};

export function buildActivationWindow(scheduledStartAt: Date, expectedDurationMinutes: number): ActivationWindow {
  const startsAt = new Date(scheduledStartAt.getTime() - appConfig.tripActivationMinutesBeforeStart * 60_000);
  const endsAt = new Date(
    scheduledStartAt.getTime() + (expectedDurationMinutes + appConfig.tripCompletionGraceMinutes) * 60_000
  );

  return { startsAt, endsAt };
}

export function isTripWindowActive(now: Date, startsAt: Date, endsAt: Date) {
  return now >= startsAt && now <= endsAt;
}

export function toCurrency(value: number, currency: string = appConfig.defaultCurrency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export const defaultServiceZones = [
  {
    code: "WPG-CENTRAL",
    name: "Winnipeg Central",
    centerLat: 49.8951,
    centerLng: -97.1384,
    radiusKm: 22
  },
  {
    code: "WPG-SOUTH",
    name: "Winnipeg South",
    centerLat: 49.8175,
    centerLng: -97.1518,
    radiusKm: 18
  }
] as const;

const hostedProductionApiBase = "https://chaufx-backend.onrender.com/api";

type MobileApiRuntime = {
  envApiUrl?: string | null;
  hostUri?: string | null;
  isDev: boolean;
  isDevice: boolean;
  platform: "ios" | "android";
  preferRemote?: boolean;
};

function normalizeApiBase(value: string) {
  return value.replace(/\/+$/, "");
}

function buildHostApiBase(hostUri?: string | null) {
  if (!hostUri || typeof hostUri !== "string") {
    return null;
  }

  const host = hostUri.split(":")[0];
  if (!host) {
    return null;
  }

  return `http://${host}:4000/api`;
}

export function buildMobileApiBaseCandidates(runtime: MobileApiRuntime) {
  const candidates: string[] = [];
  const envBase = runtime.envApiUrl ? normalizeApiBase(runtime.envApiUrl) : null;
  const hostBase = buildHostApiBase(runtime.hostUri);
  const preferRemote = runtime.preferRemote ?? false;
  const hostedBase = normalizeApiBase(hostedProductionApiBase);

  if (preferRemote) {
    if (envBase) {
      candidates.push(envBase);
    }

    candidates.push(hostedBase);

    if (runtime.isDev && hostBase) {
      candidates.push(normalizeApiBase(hostBase));
    }

    if (runtime.isDev && !runtime.isDevice) {
      if (runtime.platform === "android") {
        candidates.push("http://10.0.2.2:4000/api", "http://10.0.3.2:4000/api");
      } else {
        candidates.push("http://127.0.0.1:4000/api", "http://localhost:4000/api");
      }
    }
  } else if (runtime.isDev && !runtime.isDevice) {
    if (runtime.platform === "android") {
      candidates.push("http://10.0.2.2:4000/api", "http://10.0.3.2:4000/api");
    } else {
      candidates.push("http://127.0.0.1:4000/api", "http://localhost:4000/api");
    }

    if (hostBase) {
      candidates.push(normalizeApiBase(hostBase));
    }

    if (envBase) {
      candidates.push(envBase);
    }
  } else {
    if (runtime.isDev && hostBase) {
      candidates.push(normalizeApiBase(hostBase));
    }

    if (envBase) {
      candidates.push(envBase);
    }

    if (!runtime.isDev || runtime.isDevice) {
      candidates.push(hostedBase);
    }
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}
