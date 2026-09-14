import React from 'react';
import { CityTrafficReport, DetourRecommendation } from '../types';
import {
  Sparkles,
  X,
  AlertTriangle,
  TrendingDown,
  BrainCircuit,
  Navigation,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface AiThinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CityTrafficReport | null;
  isLoading: boolean;
  onApplyDetour: (detour: DetourRecommendation) => void;
}

export const AiThinkingModal: React.FC<AiThinkingModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading,
  onApplyDetour,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-purple-950/60 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Autonomous AI Traffic Coordinator
              </div>
              <h3 className="text-base font-bold text-white">
                Deep Thinking Traffic &amp; Detour Analysis
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 space-y-4 text-slate-200 scrollbar-thin scrollbar-thumb-slate-700">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block relative">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <Sparkles className="w-5 h-5 text-purple-400 absolute inset-0 m-auto" />
              </div>
              <p className="text-sm font-semibold text-white">
                Executing Gemini Deep Thinking Mode...
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Synthesizing metropolitan arterial flows, bottleneck choke points, and calculating optimal bypass detour routes.
              </p>
            </div>
          ) : report ? (
            <>
              {/* Score & Summary Banner */}
              <div className="rounded-xl bg-purple-950/30 border border-purple-500/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-purple-300">
                    {report.city}, {report.country}
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/40">
                    Congestion Index: {report.overallCongestionScore}% • {report.congestionStatus}
                  </span>
                </div>
                <p className="text-sm text-slate-100 leading-relaxed">{report.summary}</p>
                {report.autonomousAlert && (
                  <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{report.autonomousAlert}</span>
                  </div>
                )}
              </div>

              {/* Congested Roads & Recommended Alternative Roads */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Diagnosed Bottlenecks &amp; Alternative Bypasses
                </h4>
                <div className="space-y-2">
                  {report.congestedRoads?.map((road, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-white">{road.name}</div>
                          <p className="text-xs text-slate-400 mt-0.5">{road.cause}</p>
                        </div>
                        <div className="text-right shrink-0 font-mono text-xs font-bold text-red-400">
                          +{road.delayMins}m delay
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-slate-400 shrink-0">Bypass:</span>
                          <span className="text-emerald-300 font-bold truncate">
                            {road.alternativeRoad}
                          </span>
                        </div>
                        <span className="text-emerald-400 text-[11px] font-semibold shrink-0">
                          {road.alternativeBenefit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detour Recommendations */}
              {report.detourRecommendations?.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                    Recommended Autonomous Detour Itineraries
                  </h4>
                  <div className="space-y-2">
                    {report.detourRecommendations.map((detour, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-indigo-300">
                            {detour.from} → {detour.to}
                          </span>
                          <span className="font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Save ~{detour.timeSavedMins} mins
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-red-950/20 border border-red-500/20 text-red-300">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Congested Corridor
                            </span>
                            {detour.congestedRoute}
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                              Fast Bypass Route
                            </span>
                            {detour.alternativeRoute}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs text-slate-400 flex-1">{detour.reason}</p>
                          <button
                            type="button"
                            onClick={() => {
                              onApplyDetour(detour);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 ml-2"
                          >
                            Apply to Navigator
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Peak Hour Prediction */}
              {report.peakHourPrediction && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    <strong className="text-white">Peak Flow Prediction:</strong>{' '}
                    {report.peakHourPrediction}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">No report available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>AI Deep Thinking Engine</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
