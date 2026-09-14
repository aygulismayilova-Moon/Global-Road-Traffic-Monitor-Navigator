import { City, TrafficIncident, DetourRecommendation, CongestedRoad } from '../types';

// Deterministic seed-based random to give realistic, stable city traffic simulations that refresh on demand
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generateCityTrafficData(city: City, timestampKey: number = Date.now()): {
  incidents: TrafficIncident[];
  overallScore: number;
  status: string;
  summary: string;
  congestedRoads: CongestedRoad[];
  detourRecommendations: DetourRecommendation[];
} {
  const seed = city.lat * 100 + city.lng * 10 + (Math.floor(timestampKey / 120000) % 50);

  // Calculate city congestion index (45 - 92%)
  const rawScore = 50 + Math.floor(pseudoRandom(seed) * 42);
  const overallScore = Math.min(94, Math.max(38, rawScore));

  let status = 'Moderate Flow';
  if (overallScore > 78) status = 'Severe Gridlock';
  else if (overallScore > 64) status = 'Heavy Congestion';
  else if (overallScore < 50) status = 'Fluid Flow';

  // Generate 3-5 incidents on the city's arterials
  const arterials = city.arterials.length > 0 ? city.arterials : ['Central Expressway', 'Main Avenue', 'River Crossing Parkway'];
  const bypasses = city.alternativeBypasses.length > 0 ? city.alternativeBypasses : ['Ring Road Bypass', 'Outer Parkway Corridor'];

  const incidents: TrafficIncident[] = arterials.slice(0, 4).map((road, idx) => {
    const s = seed + idx * 7;
    const rnd = pseudoRandom(s);
    const delay = 8 + Math.floor(rnd * 22);
    const speed = Math.max(12, Math.floor(65 - delay * 1.8));
    const timeSaved = Math.max(6, Math.floor(delay * 0.75));
    const bypass = bypasses[idx % bypasses.length] || 'Parallel Orbital Bypass';
    const latOffset = (pseudoRandom(s + 1) - 0.5) * 0.045;
    const lngOffset = (pseudoRandom(s + 2) - 0.5) * 0.045;
    const types: Array<TrafficIncident['type']> = ['congestion', 'accident', 'construction', 'hazard'];
    const type = types[Math.floor(rnd * types.length)];
    const severity: TrafficIncident['severity'] = delay > 20 ? 'severe' : delay > 14 ? 'heavy' : 'moderate';

    return {
      id: `${city.id}-inc-${idx}-${Math.floor(timestampKey / 60000)}`,
      roadName: road,
      type,
      severity,
      lat: city.lat + latOffset,
      lng: city.lng + lngOffset,
      delayMinutes: delay,
      speedKmH: speed,
      description: `${type === 'accident' ? 'Multi-vehicle collision reported' : type === 'construction' ? 'Scheduled lane maintenance & resurfacing' : 'High volume bottleneck'} slowing traffic to ${speed} km/h.`,
      alternativeRouteName: bypass,
      timeSavedMinutes: timeSaved,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  });

  const congestedRoads: CongestedRoad[] = incidents.map((inc) => ({
    name: inc.roadName,
    severity: inc.severity,
    delayMins: inc.delayMinutes,
    speedKmH: inc.speedKmH,
    cause: inc.description,
    alternativeRoad: inc.alternativeRouteName,
    alternativeBenefit: `Saves ~${inc.timeSavedMinutes} mins (flowing at ${Math.min(75, inc.speedKmH + 35)} km/h)`,
  }));

  const detourRecommendations: DetourRecommendation[] = incidents.slice(0, 2).map((inc) => ({
    from: `${inc.roadName} Approach`,
    to: `${city.name} Downtown / Outer Hub`,
    congestedRoute: `Via ${inc.roadName} (Delay: +${inc.delayMinutes} min)`,
    alternativeRoute: `Via ${inc.alternativeRouteName}`,
    timeSavedMins: inc.timeSavedMinutes,
    reason: `Avoids active ${inc.type} choke point. Grade-separated bypass maintains steady speed.`,
  }));

  const summary = `Autonomous road scanner detected ${incidents.length} active slowdowns in ${city.name}. Major delay concentrated along ${incidents[0]?.roadName || 'radial expressways'}. Rerouting via ${bypasses[0] || 'outer bypasses'} saves up to ${incidents[0]?.timeSavedMinutes || 15} minutes.`;

  return {
    incidents,
    overallScore,
    status,
    summary,
    congestedRoads,
    detourRecommendations,
  };
}
