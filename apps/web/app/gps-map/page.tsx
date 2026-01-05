'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

// Importar componente del mapa dinámicamente (SSR deshabilitado para Leaflet)
const MapComponent = dynamic(() => import('@/components/GpsGlobalMapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
});

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  deviceCode?: string;
  status: string;
}

interface VehicleWithColor extends Vehicle {
  color?: string;
}

export default function GpsMapPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [mode, setMode] = useState<'history' | 'current'>('history');

  // Calcular fechas por defecto (últimos 7 días)
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    setDateFrom(sevenDaysAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadVehicles();
  }, [router]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      // Cargar todos los vehículos con paginación para obtener todos los que tienen deviceCode
      const allVehicles: Vehicle[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get(`/vehicles?page=${page}&limit=100`);
        const vehiclesData = response.data.data || [];
        
        // Filtrar solo vehículos con deviceCode
        const vehiclesWithDeviceCode = vehiclesData.filter(
          (v: Vehicle) => v.deviceCode && v.deviceCode.trim() !== ''
        );
        
        allVehicles.push(...vehiclesWithDeviceCode);
        
        const totalPages = response.data.meta?.totalPages || 1;
        hasMore = page < totalPages;
        page++;
      }

      setVehicles(allVehicles);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleToggle = (vehicleId: string) => {
    setSelectedVehicleIds((prev) => {
      if (prev.includes(vehicleId)) {
        return prev.filter((id) => id !== vehicleId);
      } else {
        return [...prev, vehicleId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedVehicleIds.length === vehicles.length) {
      setSelectedVehicleIds([]);
    } else {
      setSelectedVehicleIds(vehicles.map((v) => v.id));
    }
  };

  const selectedVehicles = vehicles.filter((v) => selectedVehicleIds.includes(v.id));

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-50">
      {/* Panel Superior: Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  disabled={mode === 'current'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={mode === 'current'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modo de Visualización
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMode('history')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  mode === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Historial
              </button>
              <button
                onClick={() => setMode('current')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  mode === 'current'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Ubicación Actual
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">
              Vehículos seleccionados: <span className="font-semibold">{selectedVehicleIds.length}</span>
            </p>
            {selectedVehicleIds.length === 0 && (
              <p className="text-xs text-orange-600">Selecciona al menos un vehículo</p>
            )}
          </div>
        </div>
      </div>

      {/* Layout Principal: Lista Lateral + Mapa */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Panel Izquierdo: Lista de Vehículos */}
        <div className="w-80 bg-white rounded-lg shadow-md p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Vehículos</h3>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedVehicleIds.length === vehicles.length ? 'Deseleccionar' : 'Seleccionar'} Todos
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-gray-500">
              <p className="text-center">
                No hay vehículos con dispositivo GPS configurado
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {vehicles.map((vehicle) => {
                const isSelected = selectedVehicleIds.includes(vehicle.id);
                return (
                  <div
                    key={vehicle.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleVehicleToggle(vehicle.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleVehicleToggle(vehicle.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 truncate">{vehicle.plate}</p>
                          <span
                            className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              vehicle.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : vehicle.status === 'MAINTENANCE'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {vehicle.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        {vehicle.deviceCode && (
                          <p className="text-xs text-gray-500 mt-1">GPS: {vehicle.deviceCode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel Principal: Mapa */}
        <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
          {selectedVehicleIds.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-xl text-gray-700 mb-2">Selecciona vehículos para visualizar</p>
                <p className="text-sm text-gray-500">
                  Elige uno o más vehículos de la lista para ver sus ubicaciones en el mapa
                </p>
              </div>
            </div>
          ) : (
            <MapComponent
              vehicleIds={selectedVehicleIds}
              dateFrom={dateFrom}
              dateTo={dateTo}
              mode={mode}
              vehicles={selectedVehicles}
            />
          )}
        </div>
      </div>
    </div>
  );
}
