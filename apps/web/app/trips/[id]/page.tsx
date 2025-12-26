'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  type?: string;
  category?: string;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
}

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm?: number;
  estimatedHours?: number;
}

interface ExpenseType {
  id: string;
  name: string;
  description?: string;
}

interface TripExpense {
  id: string;
  expenseTypeId: string;
  expenseType: ExpenseType;
  observation?: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

interface Trip {
  id: string;
  date: string;
  routeId?: string;
  route?: Route;
  vehicleId: string;
  vehicle: Vehicle;
  trailerBodyId?: string;
  trailerBody?: Vehicle;
  driver1Id?: string;
  driver1?: Driver;
  driver2Id?: string;
  driver2?: Driver;
  origin?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
  kmStart?: number;
  kmEnd?: number;
  kmTotal?: number;
  tripType?: string;
  loadType?: string;
  returnTrip?: boolean;
  baseAmount?: number;
  extraAmount?: number;
  status?: string;
  notes?: string;
  expenses?: TripExpense[];
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({
    expenseTypeId: '',
    observation: '',
    amount: '',
  });

  const formatTime = (time: string | Date | null | undefined) => {
    if (!time) return '---';
    const date = new Date(time);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
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
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const loadTrip = async () => {
    try {
      setLoading(true);
      setError('');
      const tripRes = await api.get(`/trips/${tripId}`);
      setTrip(tripRes.data);

      // Cargar tipos de gastos
      try {
        const expenseTypesRes = await api.get('/expense-types');
        setExpenseTypes(expenseTypesRes.data.data || expenseTypesRes.data || []);
      } catch (e) {
        console.error('Error loading expense types:', e);
      }
    } catch (err: any) {
      console.error('Error loading trip:', err);
      setError(err.response?.data?.message || 'Error al cargar el viaje');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadTrip();
  }, [router, tripId]);

  const handleAddExpense = async () => {
    if (!newExpense.expenseTypeId || !newExpense.amount) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      await api.post(`/trips/${tripId}/expenses`, {
        expenseTypeId: newExpense.expenseTypeId,
        observation: newExpense.observation || undefined,
        amount: parseFloat(newExpense.amount),
      });

      setNewExpense({ expenseTypeId: '', observation: '', amount: '' });
      setShowAddExpense(false);
      loadTrip();
    } catch (err: any) {
      console.error('Error adding expense:', err);
      alert(err.response?.data?.message || 'Error al agregar el gasto');
    }
  };

  const handleUpdateExpense = async (expenseId: string, data: { observation?: string; amount: number }) => {
    try {
      await api.patch(`/trips/${tripId}/expenses/${expenseId}`, data);
      setEditingExpense(null);
      loadTrip();
    } catch (err: any) {
      console.error('Error updating expense:', err);
      alert(err.response?.data?.message || 'Error al actualizar el gasto');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('¿Está seguro de eliminar este gasto?')) return;

    try {
      await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
      loadTrip();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      alert(err.response?.data?.message || 'Error al eliminar el gasto');
    }
  };

  const handleDeleteTrip = async () => {
    if (!confirm('¿Está seguro de eliminar este viaje?')) return;

    try {
      await api.delete(`/trips/${tripId}`);
      router.push('/trips');
    } catch (err: any) {
      console.error('Error deleting trip:', err);
      alert(err.response?.data?.message || 'Error al eliminar el viaje');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-gray-500">Cargando información del viaje...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-red-500 mb-4">{error || 'Viaje no encontrado'}</div>
            <button
              onClick={() => router.push('/trips')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver a Viajes
            </button>
          </div>
        </div>
      </div>
    );
  }

  const origin = trip.origin || trip.route?.origin || '---';
  const destination = trip.destination || trip.route?.destination || '---';
  const driver1Name = trip.driver1 ? `${trip.driver1.firstName} ${trip.driver1.lastName}` : 'Sin asignar';
  const driver2Name = trip.driver2 ? `${trip.driver2.firstName} ${trip.driver2.lastName}` : null;
  const kmTraveled = trip.kmEnd && trip.kmStart ? trip.kmEnd - trip.kmStart : 0;
  const totalExpenses = trip.expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/trips')}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center space-x-2"
          >
            <span>←</span>
            <span>Volver a Viajes</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalle del Viaje</h1>
              <p className="text-gray-600 mt-1">Información completa del viaje</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <button
                onClick={() => router.push(`/trips/${tripId}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={handleDeleteTrip}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trip Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">🔄</div>
                  <div>
                    <div className="font-bold text-xl text-gray-900">
                      {trip.id.substring(0, 6).toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(trip.date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(trip.status || 'PENDING')}`}
                >
                  {getStatusLabel(trip.status || 'PENDING')}
                </span>
              </div>

              {/* Route */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 uppercase">Origen</div>
                    <div className="text-lg font-semibold text-gray-900">{origin}</div>
                  </div>
                </div>
                <div className="ml-2 w-0.5 h-6 bg-gray-300"></div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 uppercase">Destino</div>
                    <div className="text-lg font-semibold text-gray-900">{destination}</div>
                  </div>
                </div>
                {trip.route?.distanceKm && (
                  <div className="ml-7 text-sm text-gray-600">
                    Distancia: {trip.route.distanceKm.toLocaleString('es-ES')} km
                  </div>
                )}
              </div>

              {/* Vehicles */}
              <div className="mb-6 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-2">Vehículos</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-xl">🚗</span>
                  <div>
                    <span className="font-medium text-gray-900">{trip.vehicle.plate}</span>
                    {trip.vehicle.brand && trip.vehicle.model && (
                      <span className="text-gray-600 ml-2">
                        - {trip.vehicle.brand} {trip.vehicle.model}
                      </span>
                    )}
                  </div>
                </div>
                {trip.trailerBody && (
                  <div className="flex items-center space-x-2 text-sm ml-8">
                    <span className="text-xl">🚛</span>
                    <div>
                      <span className="font-medium text-gray-900">{trip.trailerBody.plate}</span>
                      {trip.trailerBody.brand && trip.trailerBody.model && (
                        <span className="text-gray-600 ml-2">
                          - {trip.trailerBody.brand} {trip.trailerBody.model}
                        </span>
                      )}
                      {trip.trailerBody.type && (
                        <span className="text-gray-600 ml-2">({trip.trailerBody.type})</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drivers */}
              <div className="mb-6 space-y-2">
                <h3 className="font-semibold text-gray-900 mb-2">Conductores</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-xl">👤</span>
                  <span className="text-gray-900">{driver1Name}</span>
                </div>
                {driver2Name && (
                  <div className="flex items-center space-x-2 text-sm ml-8">
                    <span className="text-xl">👤</span>
                    <span className="text-gray-900">{driver2Name}</span>
                  </div>
                )}
              </div>

              {/* Schedule */}
              {(trip.departureTime || trip.arrivalTime) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Horarios</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <span className="text-xl">🕐</span>
                    <span>
                      Salida: {formatTime(trip.departureTime)}
                      {trip.arrivalTime && ` | Llegada: ${formatTime(trip.arrivalTime)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Kilometers */}
              {(trip.kmStart || trip.kmEnd) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Kilómetros</h3>
                  <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-600">
                      <span className="font-medium">Inicial:</span>{' '}
                      {trip.kmStart?.toLocaleString('es-ES') || '---'}
                    </div>
                    <span className="text-gray-400 text-xl">→</span>
                    <div className="text-gray-600">
                      <span className="font-medium">Final:</span>{' '}
                      {trip.kmEnd?.toLocaleString('es-ES') || '---'}
                    </div>
                  </div>
                  {kmTraveled > 0 && (
                    <div className="mt-2 text-sm font-semibold text-orange-600">
                      Recorrido total: {kmTraveled.toLocaleString('es-ES')} km
                    </div>
                  )}
                </div>
              )}

              {/* Financial Info */}
              {(trip.baseAmount || trip.extraAmount) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Información Financiera</h3>
                  <div className="space-y-2 text-sm">
                    {trip.baseAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monto Base:</span>
                        <span className="font-medium">${trip.baseAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {trip.extraAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monto Extra:</span>
                        <span className="font-medium">${trip.extraAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {trip.notes && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                    {trip.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Expenses Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Gastos del Viaje</h2>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  + Agregar Gasto
                </button>
              </div>

              {/* Add Expense Form */}
              {showAddExpense && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Nuevo Gasto</h3>
                  {expenseTypes.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                      <p className="text-sm text-yellow-800 mb-2">
                        No hay tipos de gastos disponibles. Debe crear al menos un tipo de gasto antes de agregar gastos a un viaje.
                      </p>
                      <button
                        onClick={() => router.push('/expense-types')}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        Ir a Tipos de Gastos →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Tipo de Gasto *
                          </label>
                          <button
                            onClick={() => router.push('/expense-types')}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Gestionar tipos →
                          </button>
                        </div>
                        <select
                          value={newExpense.expenseTypeId}
                          onChange={(e) =>
                            setNewExpense({ ...newExpense, expenseTypeId: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Seleccione un tipo</option>
                          {expenseTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observación
                      </label>
                      <textarea
                        value={newExpense.observation}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, observation: e.target.value })
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Descripción del gasto..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newExpense.amount}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, amount: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleAddExpense}
                          disabled={expenseTypes.length === 0}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setShowAddExpense(false);
                            setNewExpense({ expenseTypeId: '', observation: '', amount: '' });
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Expenses List */}
              {trip.expenses && trip.expenses.length > 0 ? (
                <div className="space-y-3">
                  {trip.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {editingExpense === expense.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Observación
                            </label>
                            <textarea
                              defaultValue={expense.observation || ''}
                              rows={2}
                              id={`obs-${expense.id}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Valor
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={expense.amount}
                              id={`amount-${expense.id}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const observation = (
                                  document.getElementById(`obs-${expense.id}`) as HTMLTextAreaElement
                                ).value;
                                const amount = parseFloat(
                                  (document.getElementById(`amount-${expense.id}`) as HTMLInputElement)
                                    .value,
                                );
                                handleUpdateExpense(expense.id, { observation, amount });
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingExpense(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {expense.expenseType?.name || 'Tipo desconocido'}
                            </div>
                            {expense.observation && (
                              <div className="text-sm text-gray-600 mt-1">{expense.observation}</div>
                            )}
                            <div className="text-lg font-bold text-green-600 mt-2">
                              ${Number(expense.amount).toLocaleString('es-ES', {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingExpense(expense.id)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay gastos registrados para este viaje
                </div>
              )}

              {/* Total */}
              {totalExpenses > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total de Gastos:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resumen</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-medium ${getStatusColor(trip.status || 'PENDING').split(' ')[1]}`}>
                    {getStatusLabel(trip.status || 'PENDING')}
                  </span>
                </div>
                {trip.loadType && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de Carga:</span>
                    <span className="font-medium">{trip.loadType}</span>
                  </div>
                )}
                {kmTraveled > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kilómetros:</span>
                    <span className="font-medium">{kmTraveled.toLocaleString('es-ES')} km</span>
                  </div>
                )}
                {totalExpenses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gastos:</span>
                    <span className="font-medium text-green-600">
                      ${totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Created By */}
            {trip.createdBy && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Creado Por</h3>
                <div className="text-sm text-gray-600">
                  <div>
                    {trip.createdBy.firstName} {trip.createdBy.lastName}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{trip.createdBy.email}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
