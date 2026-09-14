import { RouteOption, City, TrafficIncident } from '../types';

// Calculate distance between two lat/lng coordinates in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generates smooth road curvature points between two locations
export function generateCurvedPath(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  curvatureOffset: number = 0,
  pointsCount: number = 30
): Array<{ lat: number; lng: number }> {
  const path: Array<{ lat: number; lng: number }> = [];
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;

  // Normal vector for curvature offset
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;
  const perpLat = -dLng * curvatureOffset;
  const perpLng = dLat * curvatureOffset;

  const controlLat = midLat + perpLat;
  const controlLng = midLng + perpLng;

  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    // Quadratic Bezier interpolation
    const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * controlLat + t * t * end.lat;
    const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * controlLng + t * t * end.lng;
    path.push({ lat, lng });
  }
  return path;
}

// Request real Google Maps Routes API v2 via server proxy with alternative routes
export async function calculateGoogleRoutes(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number },
  city: City
): Promise<RouteOption[]> {
  try {
    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, city }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.routes) && data.routes.length > 0) {
        const routes: RouteOption[] = data.routes;
        // If Google returned only 1 route, generate a complementary smart Alternative Bypass route
        if (routes.length === 1 && routes[0].path.length > 2) {
          const primary = routes[0];
          const startPt = primary.path[0];
          const endPt = primary.path[primary.path.length - 1];
          const bypassPath = generateCurvedPath(startPt, endPt, 0.45, 35);
          const altBypassName = city.alternativeBypasses[0] || 'Outer Beltway Bypass';

          const altRoute: RouteOption = {
            id: 'route-alt-bypass',
            title: `Alternative Road (Via ${altBypassName})`,
            isAlternative: true,
            distance: `${(parseFloat(primary.distance) * 1.08).toFixed(1)} km`,
            distanceMeters: Math.round(primary.distanceMeters * 1.08),
            duration: `${Math.max(12, parseInt(primary.durationInTraffic || primary.duration) - 15)} min`,
            durationSeconds: Math.round(primary.durationSeconds * 0.75),
            durationInTraffic: `${Math.max(12, parseInt(primary.durationInTraffic || primary.duration) - 15)} min`,
            delayMinutes: 2,
            summary: `Autonomous bypass via ${altBypassName}. Avoids central congestion choke points.`,
            path: bypassPath,
            steps: [
              { instruction: `Depart origin and merge onto ${city.arterials[1] || 'Secondary Arterial'}`, distance: '800 m', duration: '2 min', maneuver: 'straight', lat: startPt.lat, lng: startPt.lng },
              { instruction: `Take exit toward ${altBypassName} Outer Corridor`, distance: '1.2 km', duration: '2 min', maneuver: 'right', lat: bypassPath[10]?.lat || startPt.lat, lng: bypassPath[10]?.lng || startPt.lng },
              { instruction: `Continue free-flow on ${altBypassName} for 8.5 km`, distance: '8.5 km', duration: '7 min', maneuver: 'straight', lat: bypassPath[20]?.lat || endPt.lat, lng: bypassPath[20]?.lng || endPt.lng },
              { instruction: `Merge back toward destination past the bottleneck`, distance: '900 m', duration: '2 min', maneuver: 'left', lat: endPt.lat, lng: endPt.lng },
              { instruction: 'Arrive at destination', distance: '100 m', duration: '1 min', maneuver: 'arrive', lat: endPt.lat, lng: endPt.lng },
            ],
            color: '#10B981',
            tag: 'Fast Flow Bypass',
            timeSavedVsPrimary: 15,
          };
          routes.push(altRoute);
        }
        return routes;
      }
    }
  } catch (err) {
    console.warn('Google Routes API fetch fallback to autonomous generator:', err);
  }

  return generateAutonomousRouteFallback(origin, destination, city);
}

// High-fidelity autonomous routing fallback with primary congested route and alternative bypass route
export function generateAutonomousRouteFallback(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number },
  city: City
): RouteOption[] {
  const start = typeof origin === 'object' ? origin : { lat: city.lat - 0.035, lng: city.lng - 0.04 };
  const end = typeof destination === 'object' ? destination : { lat: city.lat + 0.04, lng: city.lng + 0.035 };

  const directDistKm = haversineDistance(start.lat, start.lng, end.lat, end.lng) || 12;
  const primaryDistKm = (directDistKm * 1.25).toFixed(1);
  const altDistKm = (directDistKm * 1.38).toFixed(1);

  // Primary Path (drawn through the city center / main expressway where bottleneck occurs)
  const primaryPath = generateCurvedPath(start, end, 0.1, 40);
  // Alternative Detour Path (curved wider along outer bypass/ring)
  const alternativePath = generateCurvedPath(start, end, -0.42, 40);

  const mainArterial = city.arterials[0] || 'Central Expressway';
  const bypassRoad = city.alternativeBypasses[0] || 'Outer Ring Bypass';

  const primaryRoute: RouteOption = {
    id: 'route-primary-direct',
    title: `Direct Route (Via ${mainArterial})`,
    isAlternative: false,
    distance: `${primaryDistKm} km`,
    distanceMeters: Math.round(parseFloat(primaryDistKm) * 1000),
    duration: `${Math.round(parseFloat(primaryDistKm) * 1.4)} min`,
    durationSeconds: Math.round(parseFloat(primaryDistKm) * 1.4 * 60),
    durationInTraffic: `${Math.round(parseFloat(primaryDistKm) * 1.4 + 19)} min`,
    delayMinutes: 19,
    summary: `Via ${mainArterial}. Heavy congestion detected with 19 min queue near junction.`,
    path: primaryPath,
    steps: [
      { instruction: `Head north toward ${mainArterial}`, distance: '450 m', duration: '2 min', maneuver: 'straight', lat: start.lat, lng: start.lng },
      { instruction: `Merge onto ${mainArterial} (Slow traffic ahead)`, distance: '4.8 km', duration: '18 min', maneuver: 'right', lat: primaryPath[10].lat, lng: primaryPath[10].lng },
      { instruction: 'Heavy bottleneck: delay 19 min due to lane restriction', distance: '2.1 km', duration: '11 min', maneuver: 'straight', lat: primaryPath[20].lat, lng: primaryPath[20].lng },
      { instruction: 'Take Exit 14 toward destination arterial', distance: '1.2 km', duration: '3 min', maneuver: 'right', lat: primaryPath[30].lat, lng: primaryPath[30].lng },
      { instruction: 'Arrive at destination', distance: '200 m', duration: '1 min', maneuver: 'arrive', lat: end.lat, lng: end.lng },
    ],
    color: '#3B82F6',
    tag: 'Direct Corridor',
  };

  const alternativeRoute: RouteOption = {
    id: 'route-alternative-bypass',
    title: `Alternative Road (Via ${bypassRoad})`,
    isAlternative: true,
    distance: `${altDistKm} km`,
    distanceMeters: Math.round(parseFloat(altDistKm) * 1000),
    duration: `${Math.round(parseFloat(altDistKm) * 1.15)} min`,
    durationSeconds: Math.round(parseFloat(altDistKm) * 1.15 * 60),
    durationInTraffic: `${Math.round(parseFloat(altDistKm) * 1.15 + 2)} min`,
    delayMinutes: 2,
    summary: `Autonomous bypass via ${bypassRoad}. Free-flowing grade-separated orbital saves 17 mins.`,
    path: alternativePath,
    steps: [
      { instruction: `Divert east onto ${city.arterials[1] || 'Cross Corridor Link'}`, distance: '600 m', duration: '2 min', maneuver: 'left', lat: start.lat, lng: start.lng },
      { instruction: `Take on-ramp to ${bypassRoad} (Free Flow)`, distance: '8.4 km', duration: '8 min', maneuver: 'right', lat: alternativePath[12].lat, lng: alternativePath[12].lng },
      { instruction: `Continue at 70 km/h along ${bypassRoad}`, distance: '5.2 km', duration: '5 min', maneuver: 'straight', lat: alternativePath[22].lat, lng: alternativePath[22].lng },
      { instruction: `Take connector exit to rejoin destination boulevard`, distance: '1.5 km', duration: '2 min', maneuver: 'left', lat: alternativePath[32].lat, lng: alternativePath[32].lng },
      { instruction: 'Arrive at destination smoothly', distance: '200 m', duration: '1 min', maneuver: 'arrive', lat: end.lat, lng: end.lng },
    ],
    color: '#10B981',
    tag: 'Autonomous Detour',
    timeSavedVsPrimary: 17,
  };

  return [primaryRoute, alternativeRoute];
}

// Generate an Alternative Road comparison for a specific incident
export function generateIncidentDetourRoute(incident: TrafficIncident, city: City): {
  congestedRoute: RouteOption;
  alternativeRoute: RouteOption;
} {
  const origin = { lat: incident.lat - 0.025, lng: incident.lng - 0.025 };
  const destination = { lat: incident.lat + 0.025, lng: incident.lng + 0.025 };

  const congestedPath = generateCurvedPath(origin, destination, 0.05, 30);
  const altPath = generateCurvedPath(origin, destination, -0.4, 30);

  const congestedRoute: RouteOption = {
    id: `cong-${incident.id}`,
    title: `Congested Road: ${incident.roadName}`,
    isAlternative: false,
    distance: '6.2 km',
    distanceMeters: 6200,
    duration: '14 min',
    durationSeconds: 840,
    durationInTraffic: `${14 + incident.delayMinutes} min`,
    delayMinutes: incident.delayMinutes,
    summary: `${incident.roadName} is choked (+${incident.delayMinutes}m). Speed down to ${incident.speedKmH} km/h.`,
    path: congestedPath,
    steps: [
      { instruction: `Proceed along ${incident.roadName}`, distance: '2.0 km', duration: `${incident.delayMinutes} min`, maneuver: 'straight', lat: origin.lat, lng: origin.lng },
      { instruction: `Traffic choke point: ${incident.description}`, distance: '1.5 km', duration: '8 min', maneuver: 'straight', lat: incident.lat, lng: incident.lng },
      { instruction: 'Continue past clearance point', distance: '2.7 km', duration: '4 min', maneuver: 'straight', lat: destination.lat, lng: destination.lng },
    ],
    color: '#EF4444', // Red
    tag: 'Congested Choke Point',
  };

  const alternativeRoute: RouteOption = {
    id: `alt-${incident.id}`,
    title: `Alternative Road: ${incident.alternativeRouteName}`,
    isAlternative: true,
    distance: '7.1 km',
    distanceMeters: 7100,
    duration: '9 min',
    durationSeconds: 540,
    durationInTraffic: '10 min',
    delayMinutes: 1,
    summary: `Detour via ${incident.alternativeRouteName} completely bypasses the choke point and saves ~${incident.timeSavedMinutes} minutes.`,
    path: altPath,
    steps: [
      { instruction: `Take turn toward ${incident.alternativeRouteName}`, distance: '800 m', duration: '1 min', maneuver: 'right', lat: origin.lat, lng: origin.lng },
      { instruction: `Follow ${incident.alternativeRouteName} smoothly at 65 km/h`, distance: '5.2 km', duration: '6 min', maneuver: 'straight', lat: altPath[15]?.lat || origin.lat, lng: altPath[15]?.lng || origin.lng },
      { instruction: 'Rejoin destination corridor with no delays', distance: '1.1 km', duration: '2 min', maneuver: 'left', lat: destination.lat, lng: destination.lng },
    ],
    color: '#10B981', // Emerald
    tag: 'Recommended Bypass',
    timeSavedVsPrimary: incident.timeSavedMinutes,
  };

  return { congestedRoute, alternativeRoute };
}
