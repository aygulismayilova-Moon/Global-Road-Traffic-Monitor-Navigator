export interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  continent: 'Europe' | 'North America' | 'Asia' | 'South America' | 'Africa' | 'Oceania' | 'Middle East' | 'Global' | string;
  lat: number;
  lng: number;
  zoom: number;
  arterials: string[];
  alternativeBypasses: string[];
}

export interface TrafficIncident {
  id: string;
  roadName: string;
  type: 'congestion' | 'accident' | 'construction' | 'closure' | 'hazard';
  severity: 'low' | 'moderate' | 'heavy' | 'severe';
  lat: number;
  lng: number;
  delayMinutes: number;
  speedKmH: number;
  description: string;
  alternativeRouteName: string;
  timeSavedMinutes: number;
  timestamp: string;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver: string;
  lat: number;
  lng: number;
}

export interface RouteOption {
  id: string;
  title: string;
  isAlternative: boolean;
  distance: string;
  distanceMeters: number;
  duration: string;
  durationSeconds: number;
  durationInTraffic?: string;
  delayMinutes: number;
  summary: string;
  path: Array<{ lat: number; lng: number }>;
  steps: RouteStep[];
  color: string;
  tag: string;
  timeSavedVsPrimary?: number;
}

export interface NavigationStatus {
  isNavigating: boolean;
  isSimulated: boolean;
  currentStepIndex: number;
  currentCoord: { lat: number; lng: number } | null;
  heading: number;
  speedKmH: number;
  stepDistanceRemaining: string;
  totalDistanceRemaining: string;
  totalTimeRemaining: string;
  activeRouteId: string;
  isMuted: boolean;
}

export interface DetourRecommendation {
  from: string;
  to: string;
  congestedRoute: string;
  alternativeRoute: string;
  timeSavedMins: number;
  reason: string;
}

export interface CongestedRoad {
  name: string;
  severity: 'low' | 'moderate' | 'heavy' | 'severe';
  delayMins: number;
  speedKmH: number;
  cause: string;
  alternativeRoad: string;
  alternativeBenefit: string;
}

export interface CityTrafficReport {
  city: string;
  country: string;
  overallCongestionScore: number;
  congestionStatus: string;
  summary: string;
  congestedRoads: CongestedRoad[];
  detourRecommendations: DetourRecommendation[];
  peakHourPrediction?: string;
  autonomousAlert: string;
  lastUpdated?: string;
  modelUsed?: string;
}
