export const appConfig = {
  brandName: "ChaufX",
  tripActivationMinutesBeforeStart: 15,
  defaultCurrency: "CAD"
} as const;

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
