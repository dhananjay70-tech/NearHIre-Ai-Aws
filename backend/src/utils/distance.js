/**
 * distance.js — Haversine formula utility.
 * Returns the great-circle distance between two lat/lng points in kilometres.
 */

const EARTH_RADIUS_KM = 6371;

function toRadians(degree) {
  return degree * (Math.PI / 180);
}

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const values = {
    lat1,
    lng1,
    lat2,
    lng2,
  };

  for (const [name, value] of Object.entries(values)) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      throw new TypeError(
        `haversineDistance: ${name} must be a finite number, received ${value}`
      );
    }
  }

  const startLat = Number(lat1);
  const startLng = Number(lng1);
  const endLat = Number(lat2);
  const endLng = Number(lng2);

  if (startLat < -90 || startLat > 90) {
    throw new RangeError("lat1 must be between -90 and 90");
  }

  if (endLat < -90 || endLat > 90) {
    throw new RangeError("lat2 must be between -90 and 90");
  }

  if (startLng < -180 || startLng > 180) {
    throw new RangeError("lng1 must be between -180 and 180");
  }

  if (endLng < -180 || endLng > 180) {
    throw new RangeError("lng2 must be between -180 and 180");
  }

  const latitudeDifference = toRadians(endLat - startLat);
  const longitudeDifference = toRadians(endLng - startLng);

  const firstLatitude = toRadians(startLat);
  const secondLatitude = toRadians(endLat);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
    Math.cos(secondLatitude) *
    Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}