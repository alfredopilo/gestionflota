'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  intervalIds: string[];
}

export default function NewPlanPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Paso 1: Información básica
  const [planInfo, setPlanInfo] = useState({
    name: '',
    description: '',
    vehicleType: '',
  });

  // Paso 2: Intervalos
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [newInterval, setNewInterval] = useState({
    hours: '',
    kilometers: '',
  });

  // Paso 3: Actividades
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState({
    code: '',
    description: '',
    category: '',
  });
  const [activityMatrix, setActivityMatrix] = useState<Record<string, Record<string, boolean>>>({});

  const addInterval = () => {
    if (!newInterval.hours || !newInterval.kilometers) {
      setError('Por favor, completa horas y kilómetros');
      return;
    }

    const interval: Interval = {
      id: `temp-${Date.now()}-${intervals.length}`,
      hours: Number(newInterval.hours),
      kilometers: Number(newInterval.kilometers),
      sequenceOrder: intervals.length + 1,
    };

    setIntervals([...intervals, interval]);
    setNewInterval({ hours: '', kilometers: '' });
    setError('');
  };

  const removeInterval = (id: string) => {
    setIntervals(intervals.filter((i) => i.id !== id).map((i, idx) => ({ ...i, sequenceOrder: idx + 1 })));
  };

  const addActivity = () => {
    if (!newActivity.code || !newActivity.description) {
      setError('Por favor, completa código y descripción');
      return;
    }

    // Verificar que el código no exista
    if (activities.some((a) => a.code === newActivity.code)) {
      setError('Ya existe una actividad con este código');
      return;
    }

    const activity: Activity = {
      id: `temp-${Date.now()}-${activities.length}`,
      code: newActivity.code,
      description: newActivity.description,
      category: newActivity.category || undefined,
      intervalIds: [],
    };

    setActivities([...activities, activity]);
    setNewActivity({ code: '', description: '', category: '' });
    setError('');
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id));
    const newMatrix = { ...activityMatrix };
    delete newMatrix[id];
    setActivityMatrix(newMatrix);
  };

  const handleMatrixChange = (activityId: string, intervalId: string, applies: boolean) => {
    setActivityMatrix((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [intervalId]: applies,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!planInfo.name) {
      setError('El nombre del plan es requerido');
      setCurrentStep(1);
      return;
    }

    if (intervals.length === 0) {
      setError('Debe agregar al menos un intervalo');
      setCurrentStep(2);
      return;
    }

    if (activities.length === 0) {
      setError('Debe agregar al menos una actividad');
      setCurrentStep(3);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        name: planInfo.name,
        description: planInfo.description || undefined,
        vehicleType: planInfo.vehicleType || undefined,
        isActive: false, // Los planes nuevos se crean inactivos
        intervals: intervals.map((i) => ({
          hours: i.hours,
          kilometers: i.kilometers,
          sequenceOrder: i.sequenceOrder,
        })),
        activities: activities.map((a) => ({
          code: a.code,
          description: a.description,
          category: a.category || undefined,
          intervalIds: Object.entries(activityMatrix[a.id] || {})
            .filter(([_, applies]) => applies)
            .map(([intervalId]) => intervalId),
        })),
      };

      await api.post('/maintenance/plans', payload);
      router.push('/maintenance/plans');
    } catch (err: any) {
      console.error('Error creating plan:', err);
      let errorMessage = 'Error al crear el plan';
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

  const canProceedToStep2 = planInfo.name.trim() !== '';
  const canProceedToStep3 = intervals.length > 0;
  const canSubmit = activities.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Plan de Mantenimiento</h1>
        <p className="mt-2 text-gray-600">Crea un plan de mantenimiento paso a paso</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : currentStep > step
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step ? '✓' : step}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div
                    className={`text-sm font-medium ${
                      currentStep >= step ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step === 1 && 'Información'}
                    {step === 2 && 'Intervalos'}
                    {step === 3 && 'Actividades'}
                  </div>
                </div>
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    currentStep > step ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Información Básica */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Información del Plan</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Plan *
            </label>
            <input
              type="text"
              required
              value={planInfo.name}
              onChange={(e) => setPlanInfo({ ...planInfo, name: e.target.value })}
              placeholder="Ej: Plan Mantenimiento Preventivo - Camiones"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={planInfo.description}
              onChange={(e) => setPlanInfo({ ...planInfo, description: e.target.value })}
              rows={3}
              placeholder="Descripción opcional del plan..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Vehículo
            </label>
            <select
              value={planInfo.vehicleType}
              onChange={(e) => setPlanInfo({ ...planInfo, vehicleType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="TRUCK">Camión</option>
              <option value="TRAILER">Remolque</option>
              <option value="PICKUP">Pickup</option>
              <option value="VAN">Van</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedToStep2}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Intervalos */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Configurar Intervalos</h2>
          <p className="text-gray-600">
            Define los intervalos de mantenimiento basados en horas y kilómetros
          </p>

          {/* Formulario para agregar intervalo */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Agregar Intervalo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horas
                </label>
                <input
                  type="number"
                  min="0"
                  value={newInterval.hours}
                  onChange={(e) => setNewInterval({ ...newInterval, hours: e.target.value })}
                  placeholder="Ej: 500"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kilómetros
                </label>
                <input
                  type="number"
                  min="0"
                  value={newInterval.kilometers}
                  onChange={(e) =>
                    setNewInterval({ ...newInterval, kilometers: e.target.value })
                  }
                  placeholder="Ej: 20000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addInterval}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Agregar
                </button>
              </div>
            </div>
          </div>

          {/* Lista de intervalos */}
          {intervals.length > 0 ? (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Intervalos Configurados:</h3>
              <div className="space-y-2">
                {intervals.map((interval) => (
                  <div
                    key={interval.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold text-gray-900">
                        I{interval.sequenceOrder}
                      </span>
                      <span className="text-gray-700">
                        {interval.hours.toLocaleString('es-ES')} horas /{' '}
                        {interval.kilometers.toLocaleString('es-ES')} km
                      </span>
                    </div>
                    <button
                      onClick={() => removeInterval(interval.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay intervalos configurados. Agrega al menos uno para continuar.
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              disabled={!canProceedToStep3}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Actividades y Matriz */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Actividades y Matriz</h2>
          <p className="text-gray-600">
            Agrega actividades de mantenimiento y asigna en qué intervalos aplican
          </p>

          {/* Formulario para agregar actividad */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Agregar Actividad</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  value={newActivity.code}
                  onChange={(e) => setNewActivity({ ...newActivity, code: e.target.value })}
                  placeholder="Ej: A.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <input
                  type="text"
                  value={newActivity.category}
                  onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value })}
                  placeholder="Ej: A"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={newActivity.description}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, description: e.target.value })
                  }
                  placeholder="Ej: Revisar nivel de aceite"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={addActivity}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                + Agregar Actividad
              </button>
            </div>
          </div>

          {/* Lista de actividades */}
          {activities.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Actividades ({activities.length}):</h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{activity.code}</span>
                      {activity.category && (
                        <span className="ml-2 text-xs text-gray-600">({activity.category})</span>
                      )}
                      <span className="ml-2 text-sm text-gray-700">{activity.description}</span>
                    </div>
                    <button
                      onClick={() => removeActivity(activity.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matriz */}
          {intervals.length > 0 && activities.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Matriz de Aplicación (marca en qué intervalos aplica cada actividad)
              </h3>
              <MaintenancePlanMatrix
                intervals={intervals}
                activities={activities.map((a) => ({
                  ...a,
                  activityMatrix: Object.entries(activityMatrix[a.id] || {})
                    .filter(([_, applies]) => applies)
                    .map(([intervalId]) => ({
                      intervalId,
                      applies: true,
                    })),
                }))}
                onMatrixChange={handleMatrixChange}
                editable={true}
              />
            </div>
          )}

          {activities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay actividades configuradas. Agrega al menos una para continuar.
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Crear Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
