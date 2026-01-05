'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '@/lib/api';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet en Next.js - solo en el cliente
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface GPSLocation {
  id: string;
  vehicleId: string;
  lat: number | string;
  lng: number | string;
  speed: number | null;
  course: number | null;
  altitude: number | null;
  timestamp: string;
  online: string | null;
  sensors: any;
  rawData: any;
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  deviceCode?: string;
  status: string;
}

interface GpsGlobalMapViewProps {
  vehicleIds: string[];
  dateFrom: string;
  dateTo: string;
  mode: 'history' | 'current';
  vehicles: Vehicle[];
}

// Componente para ajustar la vista del mapa
function MapBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

/**
 * Genera un color HSL único basado en el índice del vehículo
 * Distribuye los colores uniformemente en el círculo cromático (360 grados)
 */
function generateVehicleColor(index: number, total: number): string {
  if (total === 0) return '#3b82f6';
  
  // Distribuir los colores uniformemente en el círculo HSL (0-360 grados)
  const hue = (index * 360) / total;
  
  // Mantener saturación y luminosidad en rangos óptimos para visibilidad
  const saturation = 65 + (index % 3) * 3; // Variación ligera: 65, 68, 71%
  const lightness = 50 + (index % 2) * 5; // Variación ligera: 50, 55%
  
  return hslToHex(hue, saturation, lightness);
}

/**
 * Convierte HSL a formato hexadecimal
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

export default function GpsGlobalMapView({
  vehicleIds,
  dateFrom,
  dateTo,
  mode,
  vehicles,
}: GpsGlobalMapViewProps) {
  const [locationsByVehicle, setLocationsByVehicle] = useState<Map<string, GPSLocation[]>>(new Map());
  const [currentLocationsByVehicle, setCurrentLocationsByVehicle] = useState<Map<string, GPSLocation>>(new Map());
  const [loadingVehicles, setLoadingVehicles] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  // Generar colores para cada vehículo
  const vehicleColors = new Map<string, string>();
  vehicles.forEach((vehicle, index) => {
    vehicleColors.set(vehicle.id, generateVehicleColor(index, vehicles.length));
  });

  // Convertir coordenadas a número
  const toLat = (val: number | string): number => {
    return typeof val === 'string' ? parseFloat(val) : val;
  };

  const toLng = (val: number | string): number => {
    return typeof val === 'string' ? parseFloat(val) : val;
  };

  // Calcular si el rango es ≤ 2 días
  const isRangeWithinTwoDays = (from: string, to: string): boolean => {
    if (!from || !to) return false;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  };

  const shouldShowRoute = mode === 'history' && isRangeWithinTwoDays(dateFrom, dateTo);

  // Cargar datos GPS según el modo
  useEffect(() => {
    if (vehicleIds.length === 0) return;

    const loadGPSData = async () => {
      const newLoadingVehicles = new Set<string>();
      const newErrors = new Map<string, string>();

      vehicleIds.forEach((vehicleId) => {
        newLoadingVehicles.add(vehicleId);
      });
      setLoadingVehicles(newLoadingVehicles);

      if (mode === 'current') {
        // Cargar ubicaciones actuales
        Promise.all(
          vehicleIds.map(async (vehicleId) => {
            try {
              const response = await api.get(`/gps/locations/${vehicleId}/current`);
              setCurrentLocationsByVehicle((prev) => {
                const updated = new Map(prev);
                updated.set(vehicleId, response.data);
                return updated;
              });
              newErrors.delete(vehicleId);
            } catch (err: any) {
              console.error(`Error loading current location for vehicle ${vehicleId}:`, err);
              if (err.response?.status !== 404) {
                newErrors.set(
                  vehicleId,
                  err.response?.data?.message || 'Error al cargar ubicación actual',
                );
              }
            } finally {
              newLoadingVehicles.delete(vehicleId);
              setLoadingVehicles(new Set(newLoadingVehicles));
            }
          }),
        );
      } else {
        // Cargar historial
        if (!dateFrom || !dateTo) return;

        Promise.all(
          vehicleIds.map(async (vehicleId) => {
            try {
              const params = new URLSearchParams({
                dateFrom: new Date(dateFrom).toISOString(),
                dateTo: new Date(dateTo).toISOString(),
                limit: '10000',
              });

              const response = await api.get(`/gps/locations/${vehicleId}?${params.toString()}`);
              setLocationsByVehicle((prev) => {
                const updated = new Map(prev);
                updated.set(vehicleId, response.data.data || []);
                return updated;
              });
              newErrors.delete(vehicleId);
            } catch (err: any) {
              console.error(`Error loading locations for vehicle ${vehicleId}:`, err);
              newErrors.set(vehicleId, err.response?.data?.message || 'Error al cargar ubicaciones');
            } finally {
              newLoadingVehicles.delete(vehicleId);
              setLoadingVehicles(new Set(newLoadingVehicles));
            }
          }),
        );
      }

      setErrors(newErrors);
    };

    loadGPSData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleIds, mode, dateFrom, dateTo]);

  // Crear iconos personalizados
  const createIcon = (color: string, isCurrent = false) => {
    const size = isCurrent ? 24 : 16;
    const borderSize = isCurrent ? 4 : 3;
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${borderSize}px solid white; box-shadow: 0 2px ${isCurrent ? '10px' : '8px'} rgba(0,0,0,0.3);"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Color según velocidad
  const getSpeedColor = (speed: number | null, vehicleColor: string): string => {
    if (!speed) return vehicleColor;
    if (speed < 30) return vehicleColor; // Usar color del vehículo con opacidad
    if (speed < 60) return vehicleColor;
    return vehicleColor;
  };

  // Calcular bounds para el mapa
  const calculateBounds = (): L.LatLngBounds | null => {
    const allPoints: [number, number][] = [];

    if (mode === 'current') {
      currentLocationsByVehicle.forEach((location) => {
        allPoints.push([toLat(location.lat), toLng(location.lng)]);
      });
    } else {
      locationsByVehicle.forEach((locations) => {
        locations.forEach((location) => {
          allPoints.push([toLat(location.lat), toLng(location.lng)]);
        });
      });
    }

    if (allPoints.length === 0) return null;
    return L.latLngBounds(allPoints);
  };

  const bounds = calculateBounds();
  const defaultCenter: [number, number] = [-1.8312, -78.1834]; // Centro aproximado de Ecuador

  // Obtener vehículo por ID
  const getVehicle = (vehicleId: string): Vehicle | undefined => {
    return vehicles.find((v) => v.id === vehicleId);
  };

  return (
    <div className="w-full h-full relative">
      {/* Indicadores de carga por vehículo */}
      {loadingVehicles.size > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-white bg-opacity-90 rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-700 font-medium mb-2">Cargando datos...</p>
          <div className="space-y-1">
            {Array.from(loadingVehicles).map((vehicleId) => {
              const vehicle = getVehicle(vehicleId);
              return (
                <div key={vehicleId} className="text-xs text-gray-600 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>{vehicle?.plate || vehicleId}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Errores por vehículo */}
      {errors.size > 0 && (
        <div className="absolute top-4 right-4 z-[1000] bg-red-50 border border-red-200 rounded-lg shadow-lg p-3 max-w-xs">
          <p className="text-sm text-red-800 font-medium mb-2">Errores:</p>
          <div className="space-y-1">
            {Array.from(errors.entries()).map(([vehicleId, error]) => {
              const vehicle = getVehicle(vehicleId);
              return (
                <div key={vehicleId} className="text-xs text-red-600">
                  <span className="font-medium">{vehicle?.plate || vehicleId}:</span> {error}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ajustar vista a los bounds */}
        {bounds && <MapBounds bounds={bounds} />}

        {mode === 'history' ? (
          <>
            {/* Rutas (solo si rango ≤ 2 días) */}
            {shouldShowRoute &&
              Array.from(locationsByVehicle.entries()).map(([vehicleId, locations]) => {
                const vehicle = getVehicle(vehicleId);
                const color = vehicleColors.get(vehicleId) || '#3b82f6';
                if (locations.length < 2) return null;

                const routePositions = locations.map((loc) => [
                  toLat(loc.lat),
                  toLng(loc.lng),
                ]) as [number, number][];

                return (
                  <Polyline key={`route-${vehicleId}`} positions={routePositions} color={color} weight={4} opacity={0.7} />
                );
              })}

            {/* Marcadores de ubicaciones históricas */}
            {Array.from(locationsByVehicle.entries()).map(([vehicleId, locations]) => {
              const vehicle = getVehicle(vehicleId);
              const color = vehicleColors.get(vehicleId) || '#3b82f6';

              return locations.map((location) => {
                const lat = toLat(location.lat);
                const lng = toLng(location.lng);
                const speed = location.speed ? Number(location.speed) : null;
                const timestamp = new Date(location.timestamp);

                return (
                  <Marker
                    key={location.id}
                    position={[lat, lng]}
                    icon={createIcon(getSpeedColor(speed, color))}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold mb-2" style={{ color }}>
                          {vehicle?.plate || 'Vehículo'}
                        </div>
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium">Fecha/Hora:</span>{' '}
                            {timestamp.toLocaleString('es-ES')}
                          </div>
                          <div>
                            <span className="font-medium">Velocidad:</span>{' '}
                            {speed !== null ? `${speed.toFixed(1)} km/h` : 'N/A'}
                          </div>
                          {location.course !== null && (
                            <div>
                              <span className="font-medium">Dirección:</span>{' '}
                              {Number(location.course).toFixed(0)}°
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Estado:</span> {location.online || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              });
            })}
          </>
        ) : (
          <>
            {/* Marcadores de ubicaciones actuales */}
            {Array.from(currentLocationsByVehicle.entries()).map(([vehicleId, location]) => {
              const vehicle = getVehicle(vehicleId);
              const color = vehicleColors.get(vehicleId) || '#3b82f6';
              const speed = location.speed ? Number(location.speed) : null;
              const timestamp = new Date(location.timestamp);

              return (
                <Marker
                  key={`current-${vehicleId}`}
                  position={[toLat(location.lat), toLng(location.lng)]}
                  icon={createIcon(color, true)}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold mb-2" style={{ color }}>
                        📍 {vehicle?.plate || 'Vehículo'} - Ubicación Actual
                      </div>
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium">Fecha/Hora:</span>{' '}
                          {timestamp.toLocaleString('es-ES')}
                        </div>
                        <div>
                          <span className="font-medium">Velocidad:</span>{' '}
                          {speed !== null ? `${speed.toFixed(1)} km/h` : 'N/A'}
                        </div>
                        {location.course !== null && (
                          <div>
                            <span className="font-medium">Dirección:</span>{' '}
                            {Number(location.course).toFixed(0)}°
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Estado:</span> {location.online || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        )}
      </MapContainer>

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <div className="text-sm font-semibold text-gray-900 mb-2">Vehículos en el mapa</div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {vehicles.map((vehicle) => {
            const color = vehicleColors.get(vehicle.id) || '#3b82f6';
            const isLoading = loadingVehicles.has(vehicle.id);
            const hasError = errors.has(vehicle.id);
            const hasData = mode === 'current'
              ? currentLocationsByVehicle.has(vehicle.id)
              : locationsByVehicle.has(vehicle.id) && locationsByVehicle.get(vehicle.id)!.length > 0;

            return (
              <div key={vehicle.id} className="flex items-center space-x-2 text-xs">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="flex-1 truncate font-medium">{vehicle.plate}</span>
                {isLoading && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                )}
                {hasError && <span className="text-red-500">⚠️</span>}
                {!isLoading && !hasError && !hasData && <span className="text-gray-400">—</span>}
              </div>
            );
          })}
        </div>
        {mode === 'history' && shouldShowRoute && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-green-600 font-medium">
            ✓ Mostrando rutas (rango ≤ 2 días)
          </div>
        )}
      </div>
    </div>
  );
}
