interface Coordinates {
  lat: number;
  lng: number;
}

interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
}

const AVERAGE_SPEED_KMH = 50;
const ROUTE_FACTOR = 1.3;

async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const encoded = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: {
          'User-Agent': 'SwapRunn/1.0'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Geocoding failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (data.length === 0) {
      console.error('No geocoding results for:', address);
      return null;
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371;
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function calculateRoundTripEstimate(
  pickupAddress: string,
  dropoffAddress: string
): Promise<DistanceResult | null> {
  const pickupCoords = await geocodeAddress(pickupAddress);
  if (!pickupCoords) {
    return null;
  }
  
  const dropoffCoords = await geocodeAddress(dropoffAddress);
  if (!dropoffCoords) {
    return null;
  }
  
  const straightLineDistance = haversineDistance(pickupCoords, dropoffCoords);
  const estimatedDrivingDistance = straightLineDistance * ROUTE_FACTOR;
  const roundTripDistance = estimatedDrivingDistance * 2;
  const durationHours = roundTripDistance / AVERAGE_SPEED_KMH;
  const durationMinutes = Math.round(durationHours * 60);
  
  return {
    distanceKm: Math.round(roundTripDistance * 100) / 100,
    durationMinutes
  };
}

export function calculateEstimatedPay(
  durationMinutes: number,
  hourlyRateCents: number
): number {
  const hours = durationMinutes / 60;
  return Math.round(hours * hourlyRateCents);
}
