import React, { useEffect, useRef, useState } from 'react';
import { useMap, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { RouteOption, TrafficIncident } from '../types';
import { AlertTriangle, TrendingDown, Navigation, Construction, ShieldAlert } from 'lucide-react';

interface MapLayersProps {
  showTrafficLayer: boolean;
  activeRoute: RouteOption | null;
  alternativeRoute: RouteOption | null;
  incidents: TrafficIncident[];
  selectedIncident: TrafficIncident | null;
  onSelectIncident: (inc: TrafficIncident) => void;
  onShowAlternativeRoad: (inc: TrafficIncident) => void;
  vehiclePosition: { lat: number; lng: number } | null;
  vehicleHeading: number;
  isNavigating: boolean;
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
}

export const MapLayers: React.FC<MapLayersProps> = ({
  showTrafficLayer,
  activeRoute,
  alternativeRoute,
  incidents,
  selectedIncident,
  onSelectIncident,
  onShowAlternativeRoad,
  vehiclePosition,
  vehicleHeading,
  isNavigating,
  onMapClick,
}) => {
  const map = useMap();
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const primaryPolylineRef = useRef<google.maps.Polyline | null>(null);
  const alternativePolylineRef = useRef<google.maps.Polyline | null>(null);
  const [clickedIncident, setClickedIncident] = useState<TrafficIncident | null>(null);

  // Toggle Google Maps Traffic Layer
  useEffect(() => {
    if (!map) return;
    if (showTrafficLayer) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(map);
    } else {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    }
    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, showTrafficLayer]);

  // Handle map click events (e.g. for setting origin/destination pin)
  useEffect(() => {
    if (!map || !onMapClick) return;
    const listener = map.addListener('click', onMapClick);
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapClick]);

  // Render Route Polylines (Primary Route and Alternative Route)
  useEffect(() => {
    if (!map) return;

    // Clean up previous polylines
    if (primaryPolylineRef.current) {
      primaryPolylineRef.current.setMap(null);
      primaryPolylineRef.current = null;
    }
    if (alternativePolylineRef.current) {
      alternativePolylineRef.current.setMap(null);
      alternativePolylineRef.current = null;
    }

    // Render Alternative Route Polyline first (in Emerald Green underneath)
    if (alternativeRoute && alternativeRoute.path && alternativeRoute.path.length > 0) {
      alternativePolylineRef.current = new google.maps.Polyline({
        path: alternativeRoute.path,
        geodesic: true,
        strokeColor: '#10B981', // Emerald 500
        strokeOpacity: 0.9,
        strokeWeight: 6,
        zIndex: 10,
      });
      alternativePolylineRef.current.setMap(map);
    }

    // Render Active Route Polyline
    if (activeRoute && activeRoute.path && activeRoute.path.length > 0) {
      const isAlt = activeRoute.isAlternative;
      primaryPolylineRef.current = new google.maps.Polyline({
        path: activeRoute.path,
        geodesic: true,
        strokeColor: isAlt ? '#10B981' : '#3B82F6', // Blue or Emerald
        strokeOpacity: 0.95,
        strokeWeight: 7,
        zIndex: 20,
      });
      primaryPolylineRef.current.setMap(map);

      // Fit map bounds to show route if not actively driving
      if (!isNavigating) {
        const bounds = new google.maps.LatLngBounds();
        activeRoute.path.forEach((pt) => bounds.extend(pt));
        if (alternativeRoute?.path) {
          alternativeRoute.path.forEach((pt) => bounds.extend(pt));
        }
        map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
      }
    }

    return () => {
      if (primaryPolylineRef.current) primaryPolylineRef.current.setMap(null);
      if (alternativePolylineRef.current) alternativePolylineRef.current.setMap(null);
    };
  }, [map, activeRoute, alternativeRoute, isNavigating]);

  // Pan to vehicle position during navigation
  useEffect(() => {
    if (map && isNavigating && vehiclePosition) {
      map.panTo(vehiclePosition);
    }
  }, [map, isNavigating, vehiclePosition]);

  return (
    <>
      {/* Monitored Incident Markers */}
      {incidents.map((incident) => {
        const isSelected = selectedIncident?.id === incident.id;
        const iconColor =
          incident.severity === 'severe'
            ? 'bg-red-600'
            : incident.severity === 'heavy'
            ? 'bg-orange-500'
            : 'bg-amber-500';

        return (
          <AdvancedMarker
            key={incident.id}
            position={{ lat: incident.lat, lng: incident.lng }}
            onClick={() => {
              onSelectIncident(incident);
              setClickedIncident(incident);
            }}
            title={`${incident.roadName} - ${incident.description}`}
          >
            <div
              className={`p-1.5 rounded-full ${iconColor} text-white shadow-xl cursor-pointer hover:scale-125 transition-transform flex items-center justify-center ${
                isSelected ? 'ring-4 ring-emerald-400 scale-125' : 'ring-2 ring-slate-900'
              }`}
            >
              {incident.type === 'construction' ? (
                <Construction className="w-4 h-4" />
              ) : incident.type === 'accident' ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Incident InfoWindow */}
      {clickedIncident && (
        <InfoWindow
          position={{ lat: clickedIncident.lat, lng: clickedIncident.lng }}
          onCloseClick={() => setClickedIncident(null)}
        >
          <div className="p-2 max-w-[260px] text-slate-900 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-red-600 uppercase">
                {clickedIncident.severity} slowdown
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-600">
                +{clickedIncident.delayMinutes}m delay
              </span>
            </div>
            <div className="font-bold text-sm leading-snug">{clickedIncident.roadName}</div>
            <p className="text-xs text-slate-600">{clickedIncident.description}</p>
            <div className="pt-1.5 border-t border-slate-200">
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                <span>Alternative: {clickedIncident.alternativeRouteName}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onShowAlternativeRoad(clickedIncident);
                  setClickedIncident(null);
                }}
                className="mt-1.5 w-full py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center cursor-pointer"
              >
                Show Alternative Road
              </button>
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Start / Origin Marker */}
      {activeRoute && activeRoute.path.length > 0 && (
        <AdvancedMarker position={activeRoute.path[0]} title="Origin">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xl ring-4 ring-slate-900">
            A
          </div>
        </AdvancedMarker>
      )}

      {/* End / Destination Marker */}
      {activeRoute && activeRoute.path.length > 1 && (
        <AdvancedMarker position={activeRoute.path[activeRoute.path.length - 1]} title="Destination">
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xl ring-4 ring-slate-900">
            B
          </div>
        </AdvancedMarker>
      )}

      {/* Live Animated Navigator Vehicle Marker */}
      {vehiclePosition && (
        <AdvancedMarker position={vehiclePosition} title="Vehicle Location">
          <div
            className="w-10 h-10 rounded-full bg-slate-950 border-2 border-emerald-400 text-emerald-400 shadow-2xl flex items-center justify-center transition-transform duration-300"
            style={{
              transform: `rotate(${vehicleHeading}deg)`,
            }}
          >
            <Navigation className="w-6 h-6 fill-emerald-400 text-emerald-400" />
          </div>
        </AdvancedMarker>
      )}
    </>
  );
};
