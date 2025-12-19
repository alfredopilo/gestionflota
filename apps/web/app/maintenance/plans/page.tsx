'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface MaintenancePlan {
  id: string;
  name: string;
  description?: string;
  vehicleType?: string;
  isActive: boolean;
  createdAt: string;
  intervals: Array<{
    id: string;
    hours: number;
    kilometers: number;
    sequenceOrder: number;
  }>;
  activities: Array<{
    id: string;
    code: string;
    description: string;
    category?: string;
  }>;
  _count: {
    intervals: number;
    activities: number;
  };
}

export default function MaintenancePlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterVehicleType, setFilterVehicleType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadPlans();
  }, [router, filterVehicleType, filterActive]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filterVehicleType) params.append('vehicleType', filterVehicleType);
      if (filterActive) params.append('isActive', filterActive);
      
      const response = await api.get(`/maintenance/plans?${params.toString()}`);
      setPlans(response.data || []);
    } catch (err: any) {
      console.error('Error loading plans:', err);
      setError('Error al cargar los planes de mantenimiento');
      if (err.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (planId: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await api.post(`/maintenance/plans/${planId}/deactivate`);
      } else {
        await api.post(`/maintenance/plans/${planId}/activate`);
      }
      loadPlans();
    } catch (err: any) {
      console.error('Error toggling plan status:', err);
      alert('Error al cambiar el estado del plan');
    }
  };

  const handleDelete = async (planId: string, planName: string) => {
    if (!confirm(`¿Está seguro de eliminar el plan "${planName}"?`)) return;

    try {
      await api.delete(`/maintenance/plans/${planId}`);
      loadPlans();
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      alert(err.response?.data?.message || 'Error al eliminar el plan');
    }
  };

  const handleDuplicate = async (planId: string) => {
    const newName = prompt('Ingrese el nombre para el plan duplicado:');
    if (!newName) return;

    try {
      await api.post(`/maintenance/plans/${planId}/duplicate`, { name: newName });
      loadPlans();
    } catch (err: any) {
      console.error('Error duplicating plan:', err);
      alert('Error al duplicar el plan');
    }
  };

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planes de Mantenimiento</h1>
          <p className="mt-2 text-gray-600">Gestiona los planes de mantenimiento preventivo</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/maintenance/plans/import')}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-all duration-200 hover:shadow-lg hover:scale-105 transform flex items-center space-x-2"
          >
            <span>📥</span>
            <span>Importar</span>
          </button>
          <button
            onClick={() => router.push('/maintenance/plans/new')}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105 transform flex items-center space-x-2"
          >
            <span>+</span>
            <span>Nuevo Plan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 flex space-x-4">
        <select
          value={filterVehicleType}
          onChange={(e) => setFilterVehicleType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          <option value="TRUCK">Camión</option>
          <option value="TRAILER">Remolque</option>
          <option value="PICKUP">Pickup</option>
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Grid de Planes */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay planes de mantenimiento</h3>
          <p className="text-gray-600 mb-6">Crea tu primer plan de mantenimiento o impórtalo desde Excel</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/maintenance/plans/new')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear Plan
            </button>
            <button
              onClick={() => router.push('/maintenance/plans/import')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Importar desde Excel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header del Card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {plan.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Información del Plan */}
              <div className="space-y-2 mb-4">
                {plan.vehicleType && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium text-gray-900">{plan.vehicleType}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Intervalos:</span>
                  <span className="font-medium text-gray-900">{plan._count.intervals}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">Actividades:</span>
                  <span className="font-medium text-gray-900">{plan._count.activities}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Creado:</span>
                  <span>{new Date(plan.createdAt).toLocaleDateString('es-ES')}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <button
                  onClick={() => router.push(`/maintenance/plans/${plan.id}`)}
                  className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  Ver
                </button>
                <button
                  onClick={() => handleToggleActive(plan.id, plan.isActive)}
                  className={`flex-1 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                    plan.isActive
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {plan.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleDuplicate(plan.id)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                  title="Duplicar plan"
                >
                  📋
                </button>
                <button
                  onClick={() => handleDelete(plan.id, plan.name)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
                  disabled={plan.isActive}
                  title={plan.isActive ? 'Desactiva el plan antes de eliminarlo' : 'Eliminar plan'}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
