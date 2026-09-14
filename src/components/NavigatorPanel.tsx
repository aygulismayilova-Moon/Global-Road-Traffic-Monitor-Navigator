import React, { useState } from 'react';
import { City, RouteOption, NavigationStatus } from '../types';
import {
  Navigation,
  MapPin,
  ArrowUpDown,
  Play,
  Square,
  Volume2,
  VolumeX,
  Shuffle,
  Compass,
  TrendingDown,
  Clock,
  LocateFixed,
} from 'lucide-react';
import { audioNavigator } from '../services/audioNavigator';

interface NavigatorPanelProps {
  city: City;
  originText: string;
  destinationText: string;
  onChangeOriginText: (text: string) => void;
  onChangeDestinationText: (text: string) => void;
  onSwapOriginDestination: () => void;
  onUseCurrentLocationAsOrigin: () => void;
  onCalculateRoute: () => void;
  routeOptions: RouteOption[];
  activeRoute: RouteOption | null;
  onSelectRoute: (route: RouteOption) => void;
  navigationStatus: NavigationStatus;
  onStartNavigation: (simulated: boolean) => void;
  onStopNavigation: () => void;
  onRerouteAlternative: () => void;
  onPickOnMapMode: (target: 'origin' | 'destination') => void;
  pickMode: 'origin' | 'destination' | null;
  isLoadingRoutes: boolean;
}

export const NavigatorPanel: React.FC<NavigatorPanelProps> = ({
  city,
  originText,
  destinationText,
  onChangeOriginText,
  onChangeDestinationText,
  onSwapOriginDestination,
  onUseCurrentLocationAsOrigin,
  onCalculateRoute,
  routeOptions,
  activeRoute,
  onSelectRoute,
  navigationStatus,
  onStartNavigation,
  onStopNavigation,
  onRerouteAlternative,
  onPickOnMapMode,
  pickMode,
  isLoadingRoutes,
}) => {
  const [showStepList, setShowStepList] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Quick landmark presets based on chosen city
  const cityPresets = [
    { label: `${city.name} Downtown / City Center`, val: `${city.name} City Center` },
    { label: `${city.name} International Airport`, val: `${city.name} Airport` },
    { label: `${city.name} Central Train Station`, val: `${city.name} Central Station` },
    { label: `${city.arterials[0] || 'Main Beltway'} Junction`, val: `${city.arterials[0] || 'Central Expressway'}, ${city.name}` },
    { label: `${city.alternativeBypasses[0] || 'Outer Orbital'} Hub`, val: `${city.alternativeBypasses[0] || 'Outer Ring Bypass'}, ${city.name}` },
  ];

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    audioNavigator.setEnabled(next);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4 text-slate-100 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
      {/* Route Inputs Card */}
      <div className="rounded-2xl bg-slate-800/85 border border-slate-700/80 p-4 shadow-xl backdrop-blur-md space-y-3 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Compass className="w-4 h-4" />
            <span>Turn-by-Turn GPS Navigator</span>
          </div>
          <button
            type="button"
            onClick={toggleVoice}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition cursor-pointer ${
              voiceEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-700/50 text-slate-400 border-slate-600'
            }`}
            title={voiceEnabled ? 'Voice guidance on' : 'Voice guidance muted'}
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] uppercase font-semibold">{voiceEnabled ? 'Voice On' : 'Muted'}</span>
          </button>
        </div>

        {/* Origin / Destination Inputs */}
        <div className="space-y-2 relative">
          {/* Start input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <input
              type="text"
              value={originText}
              onChange={(e) => onChangeOriginText(e.target.value)}
              placeholder={`Start location in ${city.name}...`}
              className="w-full pl-10 pr-24 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={onUseCurrentLocationAsOrigin}
                className="p-1 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                title="Use current GPS location"
              >
                <LocateFixed className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onPickOnMapMode('origin')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                  pickMode === 'origin'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {pickMode === 'origin' ? 'Click Map' : 'Map Pin'}
              </button>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-end pr-8 -my-1 relative z-10">
            <button
              type="button"
              onClick={onSwapOriginDestination}
              className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 flex items-center justify-center transition shadow-md cursor-pointer"
              title="Swap origin and destination"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
            </div>
            <input
              type="text"
              value={destinationText}
              onChange={(e) => onChangeDestinationText(e.target.value)}
              placeholder={`Destination in ${city.name}...`}
              className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => onPickOnMapMode('destination')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                  pickMode === 'destination'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {pickMode === 'destination' ? 'Click Map' : 'Map Pin'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick presets for this city */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Quick {city.name} Hubs:
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {cityPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (!originText) onChangeOriginText(preset.val);
                  else onChangeDestinationText(preset.val);
                }}
                className="px-2 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-700/80 text-[11px] text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Route Button */}
        <button
          type="button"
          onClick={onCalculateRoute}
          disabled={isLoadingRoutes || !originText.trim() || !destinationText.trim()}
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoadingRoutes ? (
            <span>Computing Routes &amp; Alternatives...</span>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              <span>Find Optimal Routes &amp; Alternatives</span>
            </>
          )}
        </button>
      </div>

      {/* Available Routes List (Primary vs Alternative Detour) */}
      {routeOptions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Calculated Routes ({routeOptions.length})
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">
              Traffic Layer Synced
            </span>
          </div>

          <div className="space-y-2">
            {routeOptions.map((route) => {
              const isSelected = activeRoute?.id === route.id;
              return (
                <div
                  key={route.id}
                  onClick={() => onSelectRoute(route)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer relative ${
                    isSelected
                      ? route.isAlternative
                        ? 'bg-slate-800/95 border-emerald-400 shadow-xl ring-1 ring-emerald-400/40'
                        : 'bg-slate-800/95 border-blue-400 shadow-xl ring-1 ring-blue-400/40'
                      : 'bg-slate-850/70 hover:bg-slate-800 border-slate-700/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            route.isAlternative
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}
                        >
                          {route.tag}
                        </span>
                        {route.timeSavedVsPrimary && route.timeSavedVsPrimary > 0 ? (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            Saves {route.timeSavedVsPrimary} min
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm font-bold text-white mt-1">
                        {route.title}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{route.summary}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold font-mono text-white">
                        {route.durationInTraffic || route.duration}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">{route.distance}</div>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Delay: {route.delayMinutes > 0 ? `+${route.delayMinutes} min` : 'Normal flow'}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {route.steps.length} maneuvers
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Controls Bar */}
      {activeRoute && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/80 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  navigationStatus.isNavigating
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {navigationStatus.isNavigating
                  ? navigationStatus.isSimulated
                    ? 'Simulation In Progress'
                    : 'Active Turn-by-Turn'
                  : 'Ready for Navigation'}
              </span>
            </div>
            {activeRoute.isAlternative && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Alternative Bypass Loaded
              </span>
            )}
          </div>

          {/* Navigation Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!navigationStatus.isNavigating ? (
              <>
                <button
                  type="button"
                  onClick={() => onStartNavigation(true)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Start Simulated Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStartNavigation(false)}
                  className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-slate-600"
                >
                  <Navigation className="w-4 h-4" />
                  <span>GPS Guidance HUD</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onStopNavigation}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>End Navigation</span>
                </button>
                <button
                  type="button"
                  onClick={onRerouteAlternative}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  title="Recalculate alternative road to bypass slowdowns"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Reroute / Bypass</span>
                </button>
              </>
            )}
          </div>

          {/* Toggle Step List */}
          <button
            type="button"
            onClick={() => setShowStepList(!showStepList)}
            className="w-full py-1.5 text-center text-xs font-medium text-slate-400 hover:text-white transition"
          >
            {showStepList ? 'Hide Directions Steps' : `Show ${activeRoute.steps.length} Turn-by-Turn Steps`}
          </button>

          {/* Step List Drawer */}
          {showStepList && (
            <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto border-t border-slate-700/60 pt-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {activeRoute.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg text-xs flex items-start gap-2.5 ${
                    navigationStatus.isNavigating && navigationStatus.currentStepIndex === idx
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                      : 'bg-slate-900/50 text-slate-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium leading-snug"
                      dangerouslySetInnerHTML={{ __html: step.instruction }}
                    />
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>{step.distance}</span>
                      <span>•</span>
                      <span>{step.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
