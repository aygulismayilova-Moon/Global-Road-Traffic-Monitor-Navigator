import React from 'react';
import { RouteOption, NavigationStatus } from '../types';
import {
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  RotateCw,
  Shuffle,
  Volume2,
  VolumeX,
  X,
  Gauge,
  Clock,
} from 'lucide-react';

interface NavigationHUDProps {
  activeRoute: RouteOption;
  status: NavigationStatus;
  onStop: () => void;
  onRerouteAlternative: () => void;
  onToggleMute: () => void;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  activeRoute,
  status,
  onStop,
  onRerouteAlternative,
  onToggleMute,
}) => {
  const currentStep = activeRoute.steps[status.currentStepIndex] || activeRoute.steps[0];
  const nextStep = activeRoute.steps[status.currentStepIndex + 1];

  // Pick directional icon based on instruction text
  const getManeuverIcon = (instruction: string) => {
    const text = instruction.toLowerCase();
    if (text.includes('right')) return <CornerUpRight className="w-8 h-8 text-emerald-400" />;
    if (text.includes('left')) return <CornerUpLeft className="w-8 h-8 text-emerald-400" />;
    if (text.includes('roundabout') || text.includes('rotary'))
      return <RotateCw className="w-8 h-8 text-emerald-400" />;
    if (text.includes('merge') || text.includes('ramp'))
      return <Shuffle className="w-8 h-8 text-emerald-400" />;
    return <ArrowUp className="w-8 h-8 text-emerald-400" />;
  };

  // Clean html instruction for display
  const cleanInstruction = currentStep?.instruction?.replace(/<[^>]*>?/gm, '') || 'Continue along route';
  const cleanNextInstruction = nextStep?.instruction?.replace(/<[^>]*>?/gm, '');

  return (
    <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[600px] max-w-[96vw] z-30 pointer-events-auto select-none space-y-2">
      {/* Primary Turn Banner */}
      <div className="rounded-2xl bg-slate-900/95 border-2 border-emerald-500/80 shadow-2xl p-4 backdrop-blur-xl flex items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
            {getManeuverIcon(cleanInstruction)}
          </div>
          <div className="min-w-0">
            <div className="text-emerald-400 font-mono font-bold text-base flex items-center gap-1.5">
              <span>{status.stepDistanceRemaining || currentStep?.distance || 'In 250 m'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-300 font-sans uppercase tracking-wider font-semibold">
                {activeRoute.isAlternative ? 'Alternative Road Active' : 'Optimal Route'}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold truncate text-white leading-tight mt-0.5">
              {cleanInstruction}
            </div>
          </div>
        </div>

        {/* Right HUD Controls: Mute & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              status.isMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
            title={status.isMuted ? 'Unmute voice navigation' : 'Mute voice navigation'}
          >
            {status.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white border border-red-500/50 transition cursor-pointer shadow-md"
            title="Exit navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Secondary Ribbon: Speedometer, Next turn preview & Reroute */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-xs text-slate-300 shadow-xl">
        {/* Next Maneuver Preview */}
        {cleanNextInstruction && (
          <div className="flex items-center gap-1.5 truncate max-w-[280px]">
            <span className="text-slate-400 text-[10px] uppercase font-bold shrink-0">Then:</span>
            <span className="truncate text-slate-200">{cleanNextInstruction}</span>
          </div>
        )}

        {/* Speedometer & ETA */}
        <div className="flex items-center gap-4 ml-auto font-mono">
          <div className="flex items-center gap-1 text-emerald-400 font-bold">
            <Gauge className="w-4 h-4" />
            <span>{status.speedKmH} km/h</span>
          </div>
          <div className="flex items-center gap-1 text-white font-bold">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{status.totalTimeRemaining || activeRoute.duration}</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            {status.totalDistanceRemaining || activeRoute.distance}
          </div>

          {/* Instant Reroute Bypass button */}
          <button
            type="button"
            onClick={onRerouteAlternative}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition shadow"
            title="Recalculate alternative road to bypass slowdowns"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Bypass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
