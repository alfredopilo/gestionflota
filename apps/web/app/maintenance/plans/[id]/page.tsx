'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import MaintenancePlanMatrix from '@/components/MaintenancePlanMatrix';

interface Interval {
  id: string;
  hours: number;
  kilometers: number;
  sequenceOrder: number;
}

interface Activity {
  id: string;
  code: string;
  description: string;
  category?: string;
  activityMatrix?: Array<{
    intervalId: string;
    applies: boolean;
  }>;
}

interface MaintenancePlan {
  id: string;
  name: string;
  description?: string;
  vehicleType?: string;
  isActive: boolean;
  createdAt: string;
  intervals: Interval[];
  activities: Activity[];
  _count: {
    intervals: number;
    activities: number;
  };
}

type TabType = 'matrix' | 'intervals' | 'activities';

export default function PlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<MaintenancePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('matrix');
  const [isEditing, setIsEditing] = useState(false);
  const [editMatrix, setEditMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadPlan();
  }, [router, planId]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/maintenance/plans/${planId}`);
      setPlan(response.data);
      
      // Inicializar matriz de edición
      const matrix: Record<string, Record<string, boolean>> = {};
      response.data.activities.forEach((activity: Activity) => {
        matrix[activity.id] = {};
        response.data.intervals.forEach((interval: Interval) => {
          const matrixEntry = activity.activityMatrix?.find((m) => m.intervalId === interval.id);
          matrix[activity.id][interval.id] = matrixEntry?.applies || false;
        });
      });
      setEditMatrix(matrix);
    } catch (err: any) {
      console.error('Error loading plan:', err);
      setError('Error al cargar el plan de mantenimiento');
      if (err.response?.status === 404) {
        setError('Plan no encontrado');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMatrixChange = (activityId: string, intervalId: string, applies: boolean) => {
    if (!isEditing) return;

    setEditMatrix((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [intervalId]: applies,
      },
    }));
  };

  const handleSaveChanges = async () => {
    if (!plan) return;

    try {
      setSaving(true);
      setError('');

      // Preparar actividades con sus intervalos asignados
      const activities = plan.activities.map((activity) => ({
        code: activity.code,
        description: activity.description,
        category: activity.category || undefined,
        intervalIds: Object.entries(editMatrix[activity.id] || {})
          .filter(([_, applies]) => applies)
          .map(([intervalId]) => intervalId),
      }));

      const payload = {
        activities,
      };

      await api.patch(`/maintenance/plans/${planId}`, payload);
      setIsEditing(false);
      await loadPlan();
    } catch (err: any) {
      console.error('Error saving changes:', err);
      let errorMessage = 'Error al guardar los cambios';
      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else {
          errorMessage = err.response.data.message;
        }
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!plan) return;

    try {
      setSaving(true);
      if (plan.isActive) {
        await api.post(`/maintenance/plans/${planId}/deactivate`);
      } else {
        await api.post(`/maintenance/plans/${planId}/activate`);
      }
      await loadPlan();
    } catch (err: any) {
      console.error('Error toggling plan status:', err);
      alert('Error al cambiar el estado del plan');
    } finally {
      setSaving(false);
    }
  };

  const categories = plan
    ? [...new Set(plan.activities.map((a) => a.category || 'Sin categoría'))]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{plan.name}</h1>
            {plan.description && (
              <p className="mt-2 text-gray-600">{plan.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                plan.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {plan.isActive ? 'Activo' : 'Inactivo'}
            </span>
            <button
              onClick={handleToggleActive}
              disabled={saving}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                plan.isActive
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } disabled:opacity-50`}
            >
              {plan.isActive ? 'Desactivar' : 'Activar'}
            </button>
            {isEditing && (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    loadPlan(); // Recargar para descartar cambios
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Editar Matriz
              </button>
            )}
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          {plan.vehicleType && (
            <span>
              <span className="font-medium">Tipo:</span> {plan.vehicleType}
            </span>
          )}
          <span>
            <span className="font-medium">Intervalos:</span> {plan._count.intervals}
          </span>
          <span>
            <span className="font-medium">Actividades:</span> {plan._count.activities}
          </span>
          <span>
            <span className="font-medium">Creado:</span>{' '}
            {new Date(plan.createdAt).toLocaleDateString('es-ES')}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'matrix' as TabType, label: 'Matriz', icon: '📊' },
            { id: 'intervals' as TabType, label: 'Intervalos', icon: '⏱️' },
            { id: 'activities' as TabType, label: 'Actividades', icon: '✓' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content: Matriz */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-lg p-4 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Buscar actividad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="min-w-[150px]">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matriz */}
          <MaintenancePlanMatrix
            intervals={plan.intervals}
            activities={plan.activities.map((activity) => ({
              ...activity,
              activityMatrix: isEditing
                ? Object.entries(editMatrix[activity.id] || {})
                    .filter(([_, applies]) => applies)
                    .map(([intervalId]) => ({
                      intervalId,
                      applies: true,
                    }))
                : activity.activityMatrix,
            }))}
            onMatrixChange={handleMatrixChange}
            editable={isEditing}
            searchTerm={searchTerm}
            filterCategory={filterCategory}
          />
        </div>
      )}

      {/* Tab Content: Intervalos */}
      {activeTab === 'intervals' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Intervalos de Mantenimiento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.intervals.map((interval) => (
              <div
                key={interval.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg text-gray-900">
                    Intervalo {interval.sequenceOrder}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Horas:</span>
                    <span className="font-medium text-gray-900">
                      {Number(interval.hours).toLocaleString('es-ES')}h
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Kilómetros:</span>
                    <span className="font-medium text-gray-900">
                      {Number(interval.kilometers).toLocaleString('es-ES')} km
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Actividades */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividades de Mantenimiento</h2>
          {Object.entries(
            plan.activities.reduce((acc, activity) => {
              const category = activity.category || 'Sin categoría';
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(activity);
              return acc;
            }, {} as Record<string, Activity[]>),
          ).map(([category, categoryActivities]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b">
                Categoría {category} ({categoryActivities.length})
              </h3>
              <div className="space-y-2">
                {categoryActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 w-16 text-sm font-medium text-gray-900">
                      {activity.code}
                    </div>
                    <div className="flex-1 text-sm text-gray-700">{activity.description}</div>
                    <div className="flex-shrink-0 text-xs text-gray-500">
                      {activity.activityMatrix?.filter((m) => m.applies).length || 0} intervalos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
