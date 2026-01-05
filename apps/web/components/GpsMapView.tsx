'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '@/lib/api';
import 'leaflet/dist/leaflet.css';

// Fix para iconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

interface GpsMapViewProps {
  vehicleId: string;
}

// Componente para ajustar la vista del mapa
function MapBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [map, bounds]);
  return null;
}

export default function GpsMapView({ vehicleId }: GpsMapViewProps) {
  const [locations, setLocations] = useState<GPSLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Calcular fecha por defecto (últimos 7 días)
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    setDateFrom(sevenDaysAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  const loadLocations = async () => {
    if (!dateFrom || !dateTo) return;

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        dateFrom: new Date(dateFrom).toISOString(),
        dateTo: new Date(dateTo).toISOString(),
        limit: '10000', // Obtener todas las ubicaciones del rango
      });

      const response = await api.get(`/gps/locations/${vehicleId}?${params.toString()}`);
      setLocations(response.data.data || []);
    } catch (err: any) {
      console.error('Error loading GPS locations:', err);
      setError(err.response?.data?.message || 'Error al cargar ubicaciones GPS');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentLocation = async () => {
    try {
      const response = await api.get(`/gps/locations/${vehicleId}/current`);
      setCurrentLocation(response.data);
    } catch (err: any) {
      console.error('Error loading current location:', err);
    }
  };

  useEffect(() => {
    if (vehicleId && dateFrom && dateTo) {
      loadLocations();
      loadCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, dateFrom, dateTo]);

  // Calcular si el rango es <= 2 días
  const isRangeWithinTwoDays = () => {
    if (!dateFrom || !dateTo) return false;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  };

  // Convertir coordenadas a número
  const toLat = (val: number | string): number => {
    return typeof val === 'string' ? parseFloat(val) : val;
  };

  const toLng = (val: number | string): number => {
    return typeof val === 'string' ? parseFloat(val) : val;
  };

  // Crear iconos personalizados
  const createIcon = (color: string) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  const currentIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 10px rgba(34,197,94,0.5);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Preparar datos para el mapa
  const shouldShowRoute = isRangeWithinTwoDays() && locations.length > 0;
  const routePositions = shouldShowRoute
    ? locations.map((loc) => [toLat(loc.lat), toLng(loc.lng)] as [number, number])
    : [];

  // Calcular bounds para el mapa
  const calculateBounds = (): L.LatLngBounds | null => {
    const allPoints: [number, number][] = [];
    
    locations.forEach((loc) => {
      allPoints.push([toLat(loc.lat), toLng(loc.lng)]);
    });
    
    if (currentLocation) {
      allPoints.push([toLat(currentLocation.lat), toLng(currentLocation.lng)]);
    }

    if (allPoints.length === 0) return null;

    return L.latLngBounds(allPoints);
  };

  const bounds = calculateBounds();

  // Color según velocidad
  const getSpeedColor = (speed: number | null): string => {
    if (!speed) return '#6b7280'; // Gris si no hay velocidad
    if (speed < 30) return '#22c55e'; // Verde - lento
    if (speed < 60) return '#f59e0b'; // Amarillo - medio
    return '#ef4444'; // Rojo - rápido
  };

  // Posición inicial del mapa (centro de Ecuador si no hay datos)
  const defaultCenter: [number, number] = [-1.8312, -78.1834]; // Centro aproximado de Ecuador

  return (
    <div className="w-full h-full flex flex-col">
      {/* Controles de filtro */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                loadLocations();
                loadCurrentLocation();
              }}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>
        {shouldShowRoute && (
          <div className="mt-3 text-sm text-green-600 font-medium">
            ✓ Mostrando ruta (rango ≤ 2 días)
          </div>
        )}
        {!shouldShowRoute && locations.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            Mostrando solo puntos (rango {'>'} 2 días)
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 relative rounded-lg overflow-hidden shadow-lg border border-gray-200">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-[1000] bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg">
            {error}
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-white bg-opacity-75 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        <MapContainer
          center={currentLocation ? [toLat(currentLocation.lat), toLng(currentLocation.lng)] : defaultCenter}
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

          {/* Ruta (solo si rango <= 2 días) */}
          {shouldShowRoute && routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
            />
          )}

          {/* Marcadores de ubicaciones históricas */}
          {locations.map((location) => {
            const lat = toLat(location.lat);
            const lng = toLng(location.lng);
            const speed = location.speed ? Number(location.speed) : null;
            const timestamp = new Date(location.timestamp);

            return (
              <Marker
                key={location.id}
                position={[lat, lng]}
                icon={createIcon(getSpeedColor(speed))}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold mb-2">Ubicación GPS</div>
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
                      {location.altitude !== null && (
                        <div>
                          <span className="font-medium">Altitud:</span>{' '}
                          {Number(location.altitude).toFixed(1)} m
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Estado:</span>{' '}
                        {location.online || 'N/A'}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Marcador de ubicación actual */}
          {currentLocation && (
            <Marker
              position={[toLat(currentLocation.lat), toLng(currentLocation.lng)]}
              icon={currentIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold mb-2 text-green-600">📍 Ubicación Actual</div>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">Fecha/Hora:</span>{' '}
                      {new Date(currentLocation.timestamp).toLocaleString('es-ES')}
                    </div>
                    <div>
                      <span className="font-medium">Velocidad:</span>{' '}
                      {currentLocation.speed !== null
                        ? `${Number(currentLocation.speed).toFixed(1)} km/h`
                        : 'N/A'}
                    </div>
                    {currentLocation.course !== null && (
                      <div>
                        <span className="font-medium">Dirección:</span>{' '}
                        {Number(currentLocation.course).toFixed(0)}°
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Estado:</span>{' '}
                      {currentLocation.online || 'N/A'}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Leyenda */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white"></div>
            <span>Ubicación Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-400 border-2 border-white"></div>
            <span>Velocidad Baja (&lt;30 km/h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white"></div>
            <span>Velocidad Media (30-60 km/h)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
            <span>Velocidad Alta ({'>'}60 km/h)</span>
          </div>
          {shouldShowRoute && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-blue-500"></div>
              <span>Ruta</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
