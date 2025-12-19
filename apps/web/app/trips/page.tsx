'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Trip {
  id: string;
  date: string;
  route?: {
    id: string;
    name: string;
    origin: string;
    destination: string;
    distanceKm?: number;
    estimatedHours?: number;
  };
  vehicle: {
    id: string;
    plate: string;
  };
  driver1?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  driver2?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  origin?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
  kmStart?: number;
  kmEnd?: number;
  notes?: string;
  status?: string;
}

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({
    today: 0,
    enRoute: 0,
    completed: 0,
    kmTraveled: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadTrips();
  }, [router, currentPage, dateFilter]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (dateFilter) {
        params.append('dateFrom', dateFilter);
        params.append('dateTo', dateFilter);
      }
      const response = await api.get(`/trips?${params.toString()}`);
      const tripsData = response.data.data || response.data || [];
      setTrips(tripsData);
      setTotalPages(response.data.meta?.totalPages || response.data.totalPages || 1);

      // Calcular estadísticas
      const todayDate = new Date().toDateString();
      const today = tripsData.filter((t: Trip) => 
        new Date(t.date).toDateString() === todayDate
      );
      const enRoute = tripsData.filter((t: Trip) => 
        t.status === 'IN_PROGRESS' || t.status === 'EN_RUTA' || t.status === 'IN_ROUTE'
      );
      const completed = tripsData.filter((t: Trip) => 
        t.status === 'COMPLETED' || t.status === 'COMPLETADO' || t.status === 'FINISHED'
      );
      const kmTraveled = completed.reduce((sum: number, t: Trip) => {
        if (t.kmStart && t.kmEnd) {
          return sum + (t.kmEnd - t.kmStart);
        }
        return sum;
      }, 0);

      setStats({
        today: today.length,
        enRoute: enRoute.length,
        completed: completed.length,
        kmTraveled,
      });
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Está seguro de eliminar este viaje?')) return;

    try {
      await api.delete(`/trips/${id}`);
      loadTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Error al eliminar el viaje');
    }
  };

  const handleImport = () => {
    router.push('/trips/import');
  };

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      !searchTerm ||
      trip.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trip.route?.name && trip.route.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (trip.driver1?.firstName && trip.driver1.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (trip.driver1?.lastName && trip.driver1.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (trip.destination && trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completado';
      case 'IN_PROGRESS':
        return 'En Ruta';
      case 'PENDING':
        return 'Pendiente';
      default:
        return status;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '---';
    return new Date(timeString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getKmTraveled = (trip: Trip) => {
    if (trip.kmStart && trip.kmEnd) {
      return trip.kmEnd - trip.kmStart;
    }
    return 0;
  };

  if (loading && trips.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Control de Viajes</h1>
        <p className="mt-2 text-gray-600">Gestiona todos los viajes de la flota</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 transform cursor-pointer" onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Viajes Hoy</p>
              <p className="text-3xl font-bold">{stats.today}</p>
            </div>
            <div className="text-4xl opacity-80">🔄</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">En Ruta</p>
              <p className="text-3xl font-bold">{stats.enRoute}</p>
            </div>
            <div className="text-4xl opacity-80">▶️</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Completados</p>
              <p className="text-3xl font-bold">{stats.completed}</p>
            </div>
            <div className="text-4xl opacity-80">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Km Recorridos</p>
              <p className="text-3xl font-bold">{stats.kmTraveled.toLocaleString('es-ES')}</p>
            </div>
            <div className="text-4xl opacity-80">🕐</div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <input
            type="text"
            placeholder="🔍 Buscar por vehículo, conductor o destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleImport}
            className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            📥 Importar
          </button>
          <button
            onClick={() => router.push('/trips/new')}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 hover:shadow-lg hover:scale-105 transform font-medium"
          >
            + Nuevo Viaje
          </button>
        </div>
      </div>

      {/* Trip Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTrips.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-500 text-lg">No hay viajes registrados</p>
          </div>
        ) : (
          filteredTrips.map((trip, index) => {
            const origin = trip.origin || trip.route?.origin || '---';
            const destination = trip.destination || trip.route?.destination || '---';
            const driverName = trip.driver1
              ? `${trip.driver1.firstName} ${trip.driver1.lastName}`
              : 'Sin asignar';
            const kmTraveled = getKmTraveled(trip);

            return (
              <div
                key={trip.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => router.push(`/trips/${trip.id}`)}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🔄</div>
                    <div>
                      <div className="font-bold text-lg text-gray-900">
                        {trip.id.substring(0, 6).toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(trip.date).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(trip.status || 'PENDING')}`}
                  >
                    {getStatusLabel(trip.status || 'PENDING')}
                  </span>
                </div>

                {/* Route */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div>
                      <div className="text-xs text-gray-600">Origen</div>
                      <div className="text-sm font-semibold text-gray-900">{origin}</div>
                    </div>
                  </div>
                  <div className="ml-1.5 w-0.5 h-4 bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <div>
                      <div className="text-xs text-gray-600">Destino</div>
                      <div className="text-sm font-semibold text-gray-900">{destination}</div>
                    </div>
                  </div>
                </div>

                {/* Driver */}
                <div className="mb-4 flex items-center space-x-2 text-sm">
                  <span>👤</span>
                  <span className="text-gray-900 font-medium">{driverName}</span>
                </div>

                {/* Schedule */}
                {(trip.departureTime || trip.arrivalTime) && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <span>🕐</span>
                      <span>
                        {formatTime(trip.departureTime)}
                        {trip.arrivalTime && ` - ${formatTime(trip.arrivalTime)}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Kilometers */}
                {(trip.kmStart || trip.kmEnd) && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        <span className="font-medium">Km Inicial:</span> {trip.kmStart?.toLocaleString('es-ES') || '---'}
                      </div>
                      <span className="text-gray-400">→</span>
                      <div className="text-gray-600">
                        <span className="font-medium">Km Final:</span> {trip.kmEnd?.toLocaleString('es-ES') || '---'}
                      </div>
                    </div>
                    {kmTraveled > 0 && (
                      <div className="mt-2 text-sm font-semibold text-orange-600">
                        Recorrido: {kmTraveled.toLocaleString('es-ES')} km
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {trip.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {trip.notes}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/trips/${trip.id}/edit`);
                    }}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => handleDelete(trip.id, e)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-gray-700">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
