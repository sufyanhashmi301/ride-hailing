export interface GeoPoint {
  lat: number;
  lng: number;
}

export const ROAD_FACTOR = 1.3;
export const AVG_SPEED_KMH = 25;

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_M * c;
}

export function roadDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  return haversineDistanceMeters(a, b) * ROAD_FACTOR;
}

export function travelTimeSeconds(distanceMeters: number): number {
  const distanceKm = distanceMeters / 1000;
  return (distanceKm / AVG_SPEED_KMH) * 3600;
}

export interface RidePackageRates {
  baseFarePkr: number;
  perKmPkr: number;
  perMinPkr: number;
  minFarePkr: number;
}

export interface FareEstimate {
  distanceM: number;
  durationS: number;
  roadFactor: number;
  avgSpeedKmh: number;
  basePkr: number;
  perKmPkr: number;
  perMinPkr: number;
  minFarePkr: number;
  totalPkr: number;
}

export function estimateFare(
  pickup: GeoPoint,
  dropoff: GeoPoint,
  rates: RidePackageRates,
): FareEstimate {
  const distanceM = roadDistanceMeters(pickup, dropoff);
  const durationS = travelTimeSeconds(distanceM);
  const distanceKm = distanceM / 1000;
  const durationMin = durationS / 60;

  const metered = rates.baseFarePkr + rates.perKmPkr * distanceKm + rates.perMinPkr * durationMin;
  const totalPkr = Math.round(Math.max(rates.minFarePkr, metered));

  return {
    distanceM: Math.round(distanceM),
    durationS: Math.round(durationS),
    roadFactor: ROAD_FACTOR,
    avgSpeedKmh: AVG_SPEED_KMH,
    basePkr: rates.baseFarePkr,
    perKmPkr: rates.perKmPkr,
    perMinPkr: rates.perMinPkr,
    minFarePkr: rates.minFarePkr,
    totalPkr,
  };
}

export function estimatePickupEtaSeconds(driverPosition: GeoPoint, pickup: GeoPoint): number {
  return Math.round(travelTimeSeconds(roadDistanceMeters(driverPosition, pickup)));
}
