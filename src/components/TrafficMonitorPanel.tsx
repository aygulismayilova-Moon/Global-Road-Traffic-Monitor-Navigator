import React, { useState } from 'react';
import { City, TrafficIncident, CityTrafficReport, CongestedRoad } from '../types';
import {
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Clock,
  Gauge,
  Sparkles,
  Volume2,
  Navigation,
  RefreshCw,
  Eye,
  CheckCircle2,
  Car,
} from 'lucide-react';
import { audioNavigator } from '../services/audioNavigator';

interface TrafficMonitorPanelProps {
  city: City;
  incidents: TrafficIncident[];
  congestionScore: number;
  status: string;
  summary: string;
  congestedRoads: CongestedRoad[];
  activeIncident: TrafficIncident | null;
  onSelectIncident: (incident: TrafficIncident) => void;
  onShowAlternativeRoad: (incident: TrafficIncident) => void;
  onNavigateAlternative: (incident: TrafficIncident) => void;
  onRefreshTraffic: () => void;
  onRequestDeepThinking: () => void;
  aiReport: CityTrafficReport | null;
  isAiLoading: boolean;
}

export const TrafficMonitorPanel: React.FC<TrafficMonitorPanelProps> = ({
  city,
  incidents,
  congestionScore,
  status,
  summary,
  _congestedRoads,
  activeIncident,
  onSelectIncident,
  onShowAlternativeRoad,
  onNavigateAlternative,
  onRefreshTraffic,
  onRequestDeepThinking,
  aiReport,
  isAiLoading,
}) => {
  const [quickVoiceLoading, setQuickVoiceLoading] = useState(false);
  const [quickVoiceText, setQuickVoiceText] = useState<string | null>(null);

  // Status color logic
  const getScoreColor = (score: number) => {
    if (score > 75) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (score > 55) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'heavy':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  const handleQuickVoiceAlert = async () => {
    setQuickVoiceLoading(true);
    try {
      const topIncident = activeIncident || incidents[0];
      const res = await fetch('/api/traffic/quick-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentRoad: topIncident?.roadName || city.arterials[0] || 'Central Expressway',
          upcomingRoad: topIncident?.alternativeRouteName || 'Outer Bypass',
          speed: topIncident?.speedKmH || 35,
          congestionLevel: status,
        }),
      });
      const data = await res.json();
      const spokenText = data.shortAlert || 'Traffic alert ahead. Alternative bypass recommended.';
      setQuickVoiceText(spokenText);
      audioNavigator.speak(spokenText, true);
    } catch (_e) {
      const fallback = `Caution in ${city.name}: slow traffic on main arterials. Alternative bypass saves 15 minutes.`;
      setQuickVoiceText(fallback);
      audioNavigator.speak(fallback, true);
    } finally {
      setQuickVoiceLoading(false);
    }
  };

  const primaryIncident = activeIncident || incidents[0];

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4 text-slate-100 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
      {/* Top Congestion Summary Card */}
      <div className="rounded-2xl bg-slate-800/80 border border-slate-700/70 p-4 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Autonomous City Traffic Radar</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <span>{city.name}</span>
              <span className="text-xs font-normal text-slate-400">({city.country})</span>
            </h2>
          </div>
          <div
            className={`px-3 py-1.5 rounded-xl border text-center font-mono font-bold shrink-0 ${getScoreColor(
              congestionScore
            )}`}
          >
            <div className="text-xl leading-none">{congestionScore}%</div>
            <div className="text-[10px] uppercase font-sans tracking-wide mt-0.5">{status}</div>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-3 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
          {summary}
        </p>

        {/* Action button row */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/50">
          <button
            type="button"
            onClick={onRefreshTraffic}
            className="px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            title="Scan city roads again"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan Arterials</span>
          </button>
          <button
            type="button"
            onClick={onRequestDeepThinking}
            disabled={isAiLoading}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAiLoading ? 'Analyzing Traffic...' : 'Deep Thinking AI Analysis'}</span>
          </button>
          <button
            type="button"
            onClick={handleQuickVoiceAlert}
            disabled={quickVoiceLoading}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ml-auto"
            title="Audio voice traffic briefing"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{quickVoiceLoading ? 'Speaking...' : 'Voice Briefing'}</span>
          </button>
        </div>

        {quickVoiceText && (
          <div className="mt-2 text-xs bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-2 rounded-lg flex items-center justify-between">
            <span>&quot;{quickVoiceText}&quot;</span>
            <button
              onClick={() => setQuickVoiceText(null)}
              className="text-[10px] text-slate-400 hover:text-white ml-2 underline"
            >
              dismiss
            </button>
          </div>
        )}
      </div>

      {/* Autonomous Alternative Road Highlight Box */}
      {primaryIncident && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 border-2 border-emerald-500/40 p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                  Autonomous Alternative Road
                </span>
                <p className="text-[11px] text-slate-400">Detour calculated to bypass current bottleneck</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Save ~{primaryIncident.timeSavedMinutes} mins
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Congested Route Box */}
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-red-400 font-semibold uppercase">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Congested Road
                </span>
                <span className="font-mono">+{primaryIncident.delayMinutes}m delay</span>
              </div>
              <div className="font-bold text-sm text-white truncate">{primaryIncident.roadName}</div>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 font-mono">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-red-400" />
                  {primaryIncident.speedKmH} km/h
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-400" />
                  Heavy Stop &amp; Go
                </span>
              </div>
            </div>

            {/* Recommended Alternative Road Box */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold uppercase">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Alternative Road
                </span>
                <span className="font-mono text-emerald-300 font-bold">Fast Flow</span>
              </div>
              <div className="font-bold text-sm text-emerald-200 truncate">
                {primaryIncident.alternativeRouteName}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 pt-1 font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Gauge className="w-3 h-3" />
                  {Math.min(75, primaryIncident.speedKmH + 35)} km/h
                </span>
                <span className="text-emerald-400 font-sans font-medium">Bypasses choke point</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-2.5">
            <strong className="text-white">Why Detour:</strong> {primaryIncident.description} Diverting via{' '}
            <span className="text-emerald-300 font-medium">{primaryIncident.alternativeRouteName}</span> avoids
            the slowdown completely.
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onShowAlternativeRoad(primaryIncident)}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-700/80 hover:bg-slate-750 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-600"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show Detour on Map</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateAlternative(primaryIncident)}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navigate Alternative Road</span>
            </button>
          </div>
        </div>
      )}

      {/* Monitored Road Arterials and Incidents */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-slate-400" />
            Detected Arterial Bottlenecks ({incidents.length})
          </span>
          <span className="text-[11px] text-slate-500">Tap to inspect detour</span>
        </div>

        <div className="space-y-2">
          {incidents.map((incident) => {
            const isSelected = activeIncident?.id === incident.id;
            return (
              <div
                key={incident.id}
                onClick={() => onSelectIncident(incident)}
                className={`p-3 rounded-xl border transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-slate-800/95 border-emerald-500/60 shadow-lg'
                    : 'bg-slate-850/60 hover:bg-slate-800/80 border-slate-700/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${getSeverityBadge(
                          incident.severity
                        )}`}
                      >
                        {incident.severity}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Speed: {incident.speedKmH} km/h
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white mt-1 truncate">
                      {incident.roadName}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                      {incident.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-red-400">
                      +{incident.delayMinutes} min
                    </div>
                    <div className="text-[10px] text-slate-500">{incident.timestamp}</div>
                  </div>
                </div>

                {/* Alternative Road snippet */}
                <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300 truncate">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-400 shrink-0">Alternative:</span>
                    <span className="text-emerald-300 font-medium truncate">
                      {incident.alternativeRouteName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowAlternativeRoad(incident);
                    }}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline shrink-0 ml-2"
                  >
                    View Detour
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Traffic Report preview if available */}
      {aiReport && (
        <div className="rounded-xl bg-purple-950/30 border border-purple-500/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              AI Deep Thinking Traffic Intelligence
            </span>
            <span className="text-[10px] text-purple-400/80 font-mono">
              {aiReport.modelUsed || 'gemini-2.5-flash'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{aiReport.summary}</p>
          {aiReport.peakHourPrediction && (
            <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-purple-500/20">
              <span className="text-purple-300 font-semibold">Prediction: </span>
              {aiReport.peakHourPrediction}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
