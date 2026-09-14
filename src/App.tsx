import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { City, TrafficIncident, RouteOption, NavigationStatus, CityTrafficReport, DetourRecommendation } from './types';
import { WORLD_CITIES } from './data/worldCities';
import { generateCityTrafficData } from './services/trafficEngine';
import { calculateGoogleRoutes, generateIncidentDetourRoute } from './services/routingService';
import { audioNavigator } from './services/audioNavigator';
import { CitySelector } from './components/CitySelector';
import { TrafficMonitorPanel } from './components/TrafficMonitorPanel';
import { NavigatorPanel } from './components/NavigatorPanel';
import { NavigationHUD } from './components/NavigationHUD';
import { MapLayers } from './components/MapLayers';
import { AiThinkingModal } from './components/AiThinkingModal';
import {
  Compass,
  AlertTriangle,
  Layers,
  Sparkles,
  LocateFixed,
  Car,
  MapPin,
  Menu,
  X,
} from 'lucide-react';

const DEFAULT_MAPS_KEY = 'AIzaSyD_wZzx4ljYMKw6PhwryiCLwI8sz0I5rSM';

// Inner component to control map camera programmatically
function MapCameraController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [map, center.lat, center.lng, zoom]);
  return null;
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(DEFAULT_MAPS_KEY);
  // App mode: 'monitor' (Autonomous Traffic Situation) or 'navigator' (GPS Navigation)
  const [activeTab, setActiveTab] = useState<'monitor' | 'navigator'>('monitor');
  // Selected City (starts with New York, user can pick ANY city/country in the world)
  const [selectedCity, setSelectedCity] = useState<City>(WORLD_CITIES[0]);

  // Traffic situations state
  const [trafficTimestamp, setTrafficTimestamp] = useState<number>(Date.now());
  const [trafficData, setTrafficData] = useState(() => generateCityTrafficData(WORLD_CITIES[0]));
  const [activeIncident, setActiveIncident] = useState<TrafficIncident | null>(null);

  // Routes state
  const [originText, setOriginText] = useState<string>('');
  const [destinationText, setDestinationText] = useState<string>('');
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [alternativeRoute, setAlternativeRoute] = useState<RouteOption | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState<boolean>(false);
  const [pickMode, setPickMode] = useState<'origin' | 'destination' | null>(null);

  // Navigation Status
  const [navStatus, setNavStatus] = useState<NavigationStatus>({
    isNavigating: false,
    isSimulated: false,
    currentStepIndex: 0,
    currentCoord: null,
    heading: 0,
    speedKmH: 0,
    stepDistanceRemaining: '',
    totalDistanceRemaining: '',
    totalTimeRemaining: '',
    activeRouteId: '',
    isMuted: false,
  });

  // Map Controls
  const [showTrafficLayer, setShowTrafficLayer] = useState<boolean>(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: WORLD_CITIES[0].lat,
    lng: WORLD_CITIES[0].lng,
  });
  const [mapZoom, setMapZoom] = useState<number>(WORLD_CITIES[0].zoom);

  // AI Deep Thinking state
  const [aiReport, setAiReport] = useState<CityTrafficReport | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Mobile sidebar drawer
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState<boolean>(true);

  // Simulation timer reference
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  // Stop Navigation callback
  const stopNavigation = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    setNavStatus((prev) => ({
      ...prev,
      isNavigating: false,
      speedKmH: 0,
      currentCoord: null,
    }));
    audioNavigator.stop();
  }, []);

  // Fetch API key from backend config on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.googleMapsApiKey) {
          setApiKey(data.googleMapsApiKey);
        }
      })
      .catch((err) => {
        console.warn('Using default maps API key:', err);
      });
  }, []);

  // Whenever a city is chosen, refresh autonomous traffic data and update default route endpoints
  useEffect(() => {
    const data = generateCityTrafficData(selectedCity, Date.now());
    setTrafficData(data);
    setActiveIncident(data.incidents[0] || null);

    // Update map camera
    setMapCenter({ lat: selectedCity.lat, lng: selectedCity.lng });
    setMapZoom(selectedCity.zoom);

    // Preset origin and destination in the new city
    setOriginText(`${selectedCity.arterials[0] || 'Central Expressway'}, ${selectedCity.name}`);
    setDestinationText(`${selectedCity.name} City Center`);

    // Reset current routes and active navigation
    if (navStatus.isNavigating) {
      stopNavigation();
    }
    setRouteOptions([]);
    setActiveRoute(null);
    setAlternativeRoute(null);

    // Auto-calculate initial alternative detour comparison for the primary congested road in this city
    if (data.incidents[0]) {
      const { congestedRoute, alternativeRoute: altDetour } = generateIncidentDetourRoute(
        data.incidents[0],
        selectedCity
      );
      setActiveRoute(congestedRoute);
      setAlternativeRoute(altDetour);
      setRouteOptions([congestedRoute, altDetour]);
    }
  }, [selectedCity.id, trafficTimestamp, stopNavigation]);

  // Refresh Traffic Radar Scan
  const handleRefreshTraffic = () => {
    setTrafficTimestamp(Date.now());
    audioNavigator.speak(`Scanning live road conditions in ${selectedCity.name}...`);
  };

  // Select an incident to inspect
  const handleSelectIncident = (incident: TrafficIncident) => {
    setActiveIncident(incident);
    setMapCenter({ lat: incident.lat, lng: incident.lng });
    setMapZoom(13);
  };

  // Show Alternative Road for a specific congested corridor
  const handleShowAlternativeRoad = (incident: TrafficIncident) => {
    setActiveIncident(incident);
    const { congestedRoute, alternativeRoute: altDetour } = generateIncidentDetourRoute(
      incident,
      selectedCity
    );
    setActiveRoute(congestedRoute);
    setAlternativeRoute(altDetour);
    setRouteOptions([congestedRoute, altDetour]);
    audioNavigator.speak(
      `Alternative road identified. Taking ${incident.alternativeRouteName} saves an estimated ${incident.timeSavedMinutes} minutes.`
    );
  };

  // Calculate Routes between Origin and Destination
  const handleCalculateRoute = async () => {
    if (!originText.trim() || !destinationText.trim()) return;
    setIsLoadingRoutes(true);
    try {
      const options = await calculateGoogleRoutes(originText, destinationText, selectedCity);
      setRouteOptions(options);
      if (options.length > 0) {
        setActiveRoute(options[0]);
        if (options.length > 1) {
          setAlternativeRoute(options[1]);
        } else {
          setAlternativeRoute(null);
        }
      }
      audioNavigator.speak(
        `Found ${options.length} routes. ${options[0]?.title}. Alternative bypass ready.`
      );
    } catch (e) {
      console.error('Route calculation error:', e);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  // Start Turn-by-Turn Navigation (Simulated Drive or GPS HUD)
  const startNavigation = (simulated: boolean = true, targetRoute?: RouteOption) => {
    const route = targetRoute || activeRoute;
    if (!route || !route.path || route.path.length === 0) return;

    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }

    setNavStatus({
      isNavigating: true,
      isSimulated: simulated,
      currentStepIndex: 0,
      currentCoord: route.path[0],
      heading: 0,
      speedKmH: 48,
      stepDistanceRemaining: route.steps[0]?.distance || '350 m',
      totalDistanceRemaining: route.distance,
      totalTimeRemaining: route.durationInTraffic || route.duration,
      activeRouteId: route.id,
      isMuted: false,
    });

    audioNavigator.speak(
      `Navigation started. ${route.steps[0]?.instruction || 'Proceed to highlighted route.'}`,
      true
    );

    if (simulated) {
      let pathIndex = 0;
      const totalPoints = route.path.length;
      const stepsCount = route.steps.length;

      simulationRef.current = setInterval(() => {
        pathIndex++;
        if (pathIndex >= totalPoints) {
          stopNavigation();
          audioNavigator.speak('You have arrived at your destination.', true);
          return;
        }

        const prev = route.path[pathIndex - 1];
        const curr = route.path[pathIndex];

        // Calculate heading angle in degrees
        const dLng = curr.lng - prev.lng;
        const dLat = curr.lat - prev.lat;
        let angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        if (angle < 0) angle += 360;

        // Advance steps based on progress
        const stepIndex = Math.min(
          stepsCount - 1,
          Math.floor((pathIndex / totalPoints) * stepsCount)
        );

        // Speed calculation (fluctuates realistically)
        const baseSpeed = route.isAlternative ? 65 : 36;
        const speed = baseSpeed + Math.floor(Math.sin(pathIndex) * 8);

        const remainingPointsRatio = (totalPoints - pathIndex) / totalPoints;
        const remainingKm = (parseFloat(route.distance) * remainingPointsRatio).toFixed(1);

        setNavStatus((prevStatus) => ({
          ...prevStatus,
          currentStepIndex: stepIndex,
          currentCoord: curr,
          heading: Math.round(angle),
          speedKmH: speed,
          totalDistanceRemaining: `${remainingKm} km`,
        }));

        // Trigger voice announcement on step change
        if (stepIndex > 0 && pathIndex % Math.max(1, Math.floor(totalPoints / stepsCount)) === 0) {
          const stepText = route.steps[stepIndex]?.instruction;
          if (stepText) {
            audioNavigator.speak(stepText.replace(/<[^>]*>?/gm, ''));
          }
        }
      }, 750);
    }
  };

  // Navigate directly via the alternative road
  const handleNavigateAlternative = (incident: TrafficIncident) => {
    const { alternativeRoute: altDetour } = generateIncidentDetourRoute(incident, selectedCity);
    setActiveRoute(altDetour);
    setAlternativeRoute(null);
    setRouteOptions([altDetour]);
    setActiveTab('navigator');
    startNavigation(true, altDetour);
    audioNavigator.speak(
      `Autonomous reroute engaged. Navigating via ${incident.alternativeRouteName} to avoid bottleneck.`
    );
  };

  // Request Deep Thinking AI Analysis
  const handleRequestDeepThinking = async () => {
    setIsAiLoading(true);
    setIsAiModalOpen(true);
    try {
      const res = await fetch('/api/traffic/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: selectedCity.name,
          country: selectedCity.country,
          knownCorridors: selectedCity.arterials,
          currentCongestion: trafficData.overallScore,
          weather: 'Clear',
        }),
      });
      const data = await res.json();
      setAiReport(data);
      if (data.autonomousAlert) {
        audioNavigator.speak(data.autonomousAlert);
      }
    } catch (err) {
      console.error('Deep thinking failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Apply a detour recommended by the AI modal
  const handleApplyDetourFromAi = (detour: DetourRecommendation) => {
    setOriginText(detour.from);
    setDestinationText(detour.to);
    setActiveTab('navigator');
    handleCalculateRoute();
  };

  // Swap Origin and Destination
  const handleSwapOriginDestination = () => {
    const temp = originText;
    setOriginText(destinationText);
    setDestinationText(temp);
  };

  // Use current browser location as start point
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setOriginText(`${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)} (My GPS)`);
          setMapCenter(coord);
          setMapZoom(14);
          audioNavigator.speak('GPS location acquired.');
        },
        () => {
          audioNavigator.speak('Could not acquire GPS position. Check permissions.');
        }
      );
    }
  };

  // Handle map clicks when picking origin or destination
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!pickMode || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const coordStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    if (pickMode === 'origin') {
      setOriginText(coordStr);
      audioNavigator.speak('Start point set on map.');
    } else {
      setDestinationText(coordStr);
      audioNavigator.speak('Destination set on map.');
    }
    setPickMode(null);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, []);

  // Dynamically reroute to alternative road during drive
  const handleRerouteAlternative = () => {
    if (alternativeRoute) {
      // Switch active and alternative routes
      const newActive = alternativeRoute;
      const newAlt = activeRoute;
      setActiveRoute(newActive);
      setAlternativeRoute(newAlt);
      audioNavigator.speak(
        `Slowdown ahead! Rerouting to ${newActive.summary}. Detour saves 14 minutes.`,
        true
      );
      if (navStatus.isNavigating) {
        startNavigation(navStatus.isSimulated, newActive);
      }
    } else {
      audioNavigator.speak('Scanning for alternative bypass road...');
      handleCalculateRoute();
    }
  };

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['routes', 'geometry', 'places', 'marker']}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
    >
      <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans select-none flex flex-col">
        {/* Top App Bar */}
        <header className="relative h-16 px-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-xl z-30 flex items-center justify-between gap-3 shrink-0 shadow-lg">
          {/* Logo & Worldwide City Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
                <Car className="w-6 h-6" />
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Road Monitor &amp; Navigator
                </div>
                <h1 className="text-sm font-extrabold text-white">Global Traffic System</h1>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            {/* City Dropdown with all World Cities & Countries */}
            <CitySelector
              selectedCity={selectedCity}
              onSelectCity={(city) => {
                setSelectedCity(city);
                audioNavigator.speak(`Switched monitor and navigation to ${city.name}, ${city.country}.`);
              }}
              onSearchCustomLocation={async (query) => {
                const q = query.trim().toLowerCase();
                const matched = WORLD_CITIES.find(
                  (c) => c.name.toLowerCase() === q || c.country.toLowerCase() === q
                );
                if (matched) {
                  setSelectedCity(matched);
                  audioNavigator.speak(`Navigating to ${matched.name}, ${matched.country}.`);
                  return;
                }
                try {
                  const res = await fetch('/api/places/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                  });
                  const data = await res.json();
                  if (data.success && data.places?.[0]?.location) {
                    const place = data.places[0];
                    const cityName = place.displayName?.text || query;
                    const countryPart =
                      place.formattedAddress?.split(',').slice(-1)[0]?.trim() || 'Worldwide';
                    const customCity: City = {
                      id: `custom-${Date.now()}`,
                      name: cityName,
                      country: countryPart,
                      countryCode:
                        place.addressComponents?.find((c: any) => c.types?.includes('country'))
                          ?.shortText || 'LOC',
                      continent: 'Global',
                      lat: place.location.latitude,
                      lng: place.location.longitude,
                      zoom: 12,
                      arterials: [
                        `${cityName} Central Expressway`,
                        `${cityName} Beltway`,
                        `${cityName} Main Avenue`,
                      ],
                      alternativeBypasses: [
                        `${cityName} Outer Orbital Bypass`,
                        `${cityName} Perimeter Parkway`,
                      ],
                    };
                    setSelectedCity(customCity);
                    audioNavigator.speak(`Navigating to ${cityName}, ${countryPart}.`);
                  }
                } catch (e) {
                  console.warn('Location search error:', e);
                }
              }}
            />
          </div>

          {/* Navigation / Monitor Tab Switcher */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('monitor')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'monitor'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Traffic Monitor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('navigator')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'navigator'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>GPS Navigator</span>
            </button>
          </div>

          {/* Right Action Tools: Traffic Layer, AI Thinking & Mobile Toggle */}
          <div className="flex items-center gap-2">
            {/* Toggle Google Traffic Layer */}
            <button
              type="button"
              onClick={() => setShowTrafficLayer(!showTrafficLayer)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                showTrafficLayer
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={showTrafficLayer ? 'Google Traffic Layer Visible' : 'Traffic Layer Hidden'}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden md:inline">Traffic Layer</span>
            </button>

            {/* Deep Thinking AI Button */}
            <button
              type="button"
              onClick={handleRequestDeepThinking}
              disabled={isAiLoading}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Autonomous traffic bottleneck reasoning"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Analysis</span>
            </button>

            {/* Mobile panel toggle */}
            <button
              type="button"
              onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
            >
              {isMobilePanelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Main Body: Split Screen (Side Control Panel + Full-Screen Google Map) */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* Left / Sliding Control Panel */}
          <aside
            className={`absolute lg:relative top-0 left-0 bottom-0 z-20 w-full sm:w-[420px] lg:w-[460px] bg-slate-900/95 lg:bg-slate-900/90 border-r border-slate-800 backdrop-blur-2xl flex flex-col transition-transform duration-300 ${
              isMobilePanelOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            {/* Mobile Tabs Bar */}
            <div className="sm:hidden p-2 border-b border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('monitor')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center ${
                  activeTab === 'monitor'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Traffic Monitor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('navigator')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center ${
                  activeTab === 'navigator'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                GPS Navigator
              </button>
            </div>

            {/* Panel Content Based on Active Tab */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'monitor' ? (
                <TrafficMonitorPanel
                  city={selectedCity}
                  incidents={trafficData.incidents}
                  congestionScore={trafficData.overallScore}
                  status={trafficData.status}
                  summary={trafficData.summary}
                  congestedRoads={trafficData.congestedRoads}
                  activeIncident={activeIncident}
                  onSelectIncident={handleSelectIncident}
                  onShowAlternativeRoad={handleShowAlternativeRoad}
                  onNavigateAlternative={handleNavigateAlternative}
                  onRefreshTraffic={handleRefreshTraffic}
                  onRequestDeepThinking={handleRequestDeepThinking}
                  aiReport={aiReport}
                  isAiLoading={isAiLoading}
                />
              ) : (
                <NavigatorPanel
                  city={selectedCity}
                  originText={originText}
                  destinationText={destinationText}
                  onChangeOriginText={setOriginText}
                  onChangeDestinationText={setDestinationText}
                  onSwapOriginDestination={handleSwapOriginDestination}
                  onUseCurrentLocationAsOrigin={handleUseCurrentLocation}
                  onCalculateRoute={handleCalculateRoute}
                  routeOptions={routeOptions}
                  activeRoute={activeRoute}
                  onSelectRoute={(route) => {
                    setActiveRoute(route);
                    if (routeOptions.length > 1) {
                      const other = routeOptions.find((r) => r.id !== route.id);
                      setAlternativeRoute(other || null);
                    }
                  }}
                  navigationStatus={navStatus}
                  onStartNavigation={startNavigation}
                  onStopNavigation={stopNavigation}
                  onRerouteAlternative={handleRerouteAlternative}
                  onPickOnMapMode={(target) => setPickMode(target)}
                  pickMode={pickMode}
                  isLoadingRoutes={isLoadingRoutes}
                />
              )}
            </div>

            {/* Bottom Panel Status Bar */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-950/70 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Google Maps Platform Connected</span>
              </div>
              <span className="text-slate-500 font-mono">
                {trafficData.incidents.length} choke points mapped
              </span>
            </div>
          </aside>

          {/* Right Map Canvas Container */}
          <main className="flex-1 relative h-full w-full">
            {/* Live Navigation Heads-Up Display (HUD) */}
            {navStatus.isNavigating && activeRoute && (
              <NavigationHUD
                activeRoute={activeRoute}
                status={navStatus}
                onStop={stopNavigation}
                onRerouteAlternative={handleRerouteAlternative}
                onToggleMute={() => {
                  const nextMute = !navStatus.isMuted;
                  setNavStatus((s) => ({ ...s, isMuted: nextMute }));
                  audioNavigator.setEnabled(!nextMute);
                }}
              />
            )}

            {/* Map Pin Pick Prompt Banner */}
            {pickMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
                <MapPin className="w-4 h-4" />
                <span>Click anywhere on the map to set {pickMode.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => setPickMode(null)}
                  className="p-0.5 rounded-full hover:bg-emerald-600 text-slate-950"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Google Map */}
            <Map
              defaultCenter={mapCenter}
              defaultZoom={mapZoom}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
              mapId="DEMO_MAP_ID"
            >
              <MapCameraController center={mapCenter} zoom={mapZoom} />
              {/* Map Layers Component: TrafficLayer, Route Polylines, Markers */}
              <MapLayers
                showTrafficLayer={showTrafficLayer}
                activeRoute={activeRoute}
                alternativeRoute={alternativeRoute}
                incidents={trafficData.incidents}
                selectedIncident={activeIncident}
                onSelectIncident={handleSelectIncident}
                onShowAlternativeRoad={handleShowAlternativeRoad}
                vehiclePosition={navStatus.currentCoord}
                vehicleHeading={navStatus.heading}
                isNavigating={navStatus.isNavigating}
                onMapClick={handleMapClick}
              />
            </Map>

            {/* Floating Map Quick Controls */}
            <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700/90 text-slate-200 hover:text-emerald-400 hover:bg-slate-800 shadow-xl backdrop-blur-md flex items-center justify-center transition cursor-pointer"
                title="Locate me"
              >
                <LocateFixed className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapCenter({ lat: selectedCity.lat, lng: selectedCity.lng });
                  setMapZoom(selectedCity.zoom);
                }}
                className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700/90 text-slate-200 hover:text-white hover:bg-slate-800 shadow-xl backdrop-blur-md flex items-center justify-center transition cursor-pointer text-xs font-bold"
                title="Center on current city"
              >
                {selectedCity.countryCode}
              </button>
            </div>
          </main>
        </div>

        {/* Gemini Deep Thinking Modal */}
        <AiThinkingModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          report={aiReport}
          isLoading={isAiLoading}
          onApplyDetour={handleApplyDetourFromAi}
        />
      </div>
    </APIProvider>
  );
}
