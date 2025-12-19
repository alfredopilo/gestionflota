'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Route {
  id: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm?: number;
  estimatedHours?: number;
}

export default function RoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadRoutes();
  }, [router]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/routes?page=1&limit=100');
      setRoutes(response.data.data || []);
    } catch (error) {
      console.error('Error loading routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedRoute(null);
    setIsModalOpen(true);
  };

  const handleEdit = (route: Route) => {
    setSelectedRoute(route);
    setIsModalOpen(true);
  };

  const handleSave = async (route: Route) => {
    try {
      const payload: any = {
        code: route.code.trim(),
        name: route.name.trim(),
        origin: route.origin.trim(),
        destination: route.destination.trim(),
      };

      if (route.distanceKm) payload.distanceKm = Number(route.distanceKm);
      if (route.estimatedHours) payload.estimatedHours = Number(route.estimatedHours);

      if (route.id) {
        await api.patch(`/routes/${route.id}`, payload);
      } else {
        await api.post('/routes', payload);
      }
      setIsModalOpen(false);
      loadRoutes();
    } catch (error: any) {
      console.error('Error saving route:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Está seguro de eliminar esta ruta?')) return;

    try {
      await api.delete(`/routes/${id}`);
      loadRoutes();
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Error al eliminar la ruta');
    }
  };

  const filteredRoutes = routes.filter(
    (r) =>
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.destination.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading && routes.length === 0) {
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
        <h1 className="text-3xl font-bold text-gray-900">Rutas</h1>
        <p className="mt-2 text-gray-600">Gestiona las rutas de la flota</p>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 Buscar por código, nombre, origen o destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleCreate}
          className="ml-4 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 transform"
        >
          + Nueva Ruta
        </button>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoutes.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-500 text-lg">No hay rutas registradas</p>
          </div>
        ) : (
          filteredRoutes.map((route, index) => (
            <div
              key={route.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Route Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-bold text-lg text-gray-900">{route.code}</div>
                  <div className="text-sm text-gray-600">{route.name}</div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(route)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => handleDelete(route.id, e)}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Route Path */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div>
                    <div className="text-xs text-gray-600">Origen</div>
                    <div className="text-sm font-semibold text-gray-900">{route.origin}</div>
                  </div>
                </div>
                <div className="ml-1.5 w-0.5 h-4 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <div>
                    <div className="text-xs text-gray-600">Destino</div>
                    <div className="text-sm font-semibold text-gray-900">{route.destination}</div>
                  </div>
                </div>
              </div>

              {/* Route Metrics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {route.distanceKm && (
                  <div>
                    <div className="text-xs text-gray-600">Distancia</div>
                    <div className="text-lg font-bold text-gray-900">
                      {Number(route.distanceKm).toLocaleString('es-ES')} km
                    </div>
                  </div>
                )}
                {route.estimatedHours && (
                  <div>
                    <div className="text-xs text-gray-600">Tiempo Estimado</div>
                    <div className="text-lg font-bold text-blue-600">
                      {Number(route.estimatedHours).toFixed(1)} h
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Route Modal */}
      {isModalOpen && (
        <RouteModal
          route={selectedRoute}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// Route Modal Component
function RouteModal({
  route,
  onClose,
  onSave,
}: {
  route: Route | null;
  onClose: () => void;
  onSave: (route: Route) => Promise<void>;
}) {
  const [formData, setFormData] = useState<Route>({
    id: route?.id || '',
    code: route?.code || '',
    name: route?.name || '',
    origin: route?.origin || '',
    destination: route?.destination || '',
    distanceKm: route?.distanceKm || undefined,
    estimatedHours: route?.estimatedHours || undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSave(formData);
    } catch (err: any) {
      let errorMessage = 'Error al guardar la ruta';
      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else {
          errorMessage = err.response.data.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 animate-slide-in">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {route ? 'Editar Ruta' : 'Nueva Ruta'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origen *
              </label>
              <input
                type="text"
                required
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                placeholder="Ej: Planta La Fabril - Manta"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destino *
              </label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="Ej: Bodega Quito"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distancia (km)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.distanceKm || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      distanceKm: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiempo Estimado (horas) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={formData.estimatedHours || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="Ej: 8.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
