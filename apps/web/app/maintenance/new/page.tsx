'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  odometer: number;
  hourmeter: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Workshop {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface SuggestedActivity {
  id: string;
  code: string;
  description: string;
  category?: string;
}

interface MaintenanceSuggestion {
  nextIntervals: Array<{
    interval: {
      id: string;
      hours: number;
      kilometers: number;
      sequenceOrder: number;
    };
    kmUntilNext: number;
    hoursUntilNext: number;
    isDue: boolean;
    isUpcoming?: boolean;
  }>;
  applicableActivities: SuggestedActivity[];
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [operators, setOperators] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showWorkshopModal, setShowWorkshopModal] = useState(false);
  const [savingWorkshop, setSavingWorkshop] = useState(false);
  const [suggestion, setSuggestion] = useState<MaintenanceSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    type: 'PREVENTIVE',
    scheduledDate: '',
    odometerAtStart: '',
    hourmeterAtStart: '',
    operatorId: '',
    supervisorId: '',
    isInternal: true,
    workshopId: '',
    notes: '',
  });
  const [workshopForm, setWorkshopForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Cargar vehículos
      const vehiclesRes = await api.get('/vehicles?page=1&limit=100');
      setVehicles(vehiclesRes.data.data || []);

      // Cargar talleres
      try {
        const workshopsRes = await api.get('/workshops');
        setWorkshops(workshopsRes.data || []);
      } catch (e) {
        console.log('No se pudieron cargar talleres:', e);
        setWorkshops([]);
      }

      // Cargar usuarios para operadores y supervisores
      try {
        const usersRes = await api.get('/admin/users?page=1&limit=100');
        const responseData = usersRes.data?.data || usersRes.data || [];
        const usersArray = Array.isArray(responseData) ? responseData : [];
        
        // Filtrar operadores (OPERADOR_TALLER)
        setOperators(
          usersArray.filter(
            (u: any) =>
              u.isActive !== false &&
              (u.roles?.includes('OPERADOR_TALLER') || u.roles?.includes('JEFE_TALLER')),
          ),
        );

        // Filtrar supervisores (JEFE_TALLER, GERENCIA)
        setSupervisors(
          usersArray.filter(
            (u: any) =>
              u.isActive !== false &&
              (u.roles?.includes('JEFE_TALLER') || u.roles?.includes('GERENCIA')),
          ),
        );
      } catch (e) {
        console.log('No se pudieron cargar usuarios:', e);
        setOperators([]);
        setSupervisors([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error al cargar los datos. Por favor, intenta nuevamente.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleVehicleChange = async (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setFormData({
        ...formData,
        vehicleId,
        odometerAtStart: vehicle.odometer?.toString() || '',
        hourmeterAtStart: vehicle.hourmeter?.toString() || '',
      });

      // Si es mantenimiento preventivo, obtener sugerencias
      if (formData.type === 'PREVENTIVE') {
        await loadMaintenanceSuggestion(vehicleId);
      }
    } else {
      setFormData({ ...formData, vehicleId });
      setSuggestion(null);
    }
  };

  const loadMaintenanceSuggestion = async (vehicleId: string) => {
    try {
      setLoadingSuggestion(true);
      const response = await api.get(`/maintenance/plan/next-maintenance/${vehicleId}`);
      setSuggestion(response.data);
    } catch (err: any) {
      console.error('Error loading maintenance suggestion:', err);
      // No mostrar error si no hay plan activo, es opcional
      if (err.response?.status !== 404) {
        console.warn('No se pudo cargar la sugerencia de mantenimiento');
      }
      setSuggestion(null);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWorkshop(true);

    try {
      const response = await api.post('/workshops', workshopForm);
      const newWorkshop = response.data;
      
      // Actualizar lista de talleres
      setWorkshops([...workshops, newWorkshop]);
      
      // Seleccionar el nuevo taller
      setFormData({ ...formData, workshopId: newWorkshop.id });
      
      // Cerrar modal y limpiar formulario
      setShowWorkshopModal(false);
      setWorkshopForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
    } catch (err: any) {
      console.error('Error creating workshop:', err);
      alert('Error al crear el taller: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingWorkshop(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        vehicleId: formData.vehicleId,
        type: formData.type,
        isInternal: formData.isInternal,
      };

      if (formData.scheduledDate) {
        payload.scheduledDate = new Date(formData.scheduledDate).toISOString();
      }
      if (formData.odometerAtStart) {
        payload.odometerAtStart = Number(formData.odometerAtStart);
      }
      if (formData.hourmeterAtStart) {
        payload.hourmeterAtStart = Number(formData.hourmeterAtStart);
      }
      if (formData.operatorId) {
        payload.operatorId = formData.operatorId;
      }
      if (formData.supervisorId) {
        payload.supervisorId = formData.supervisorId;
      }
      if (!formData.isInternal && formData.workshopId) {
        payload.workshopId = formData.workshopId;
      }
      if (formData.notes) {
        payload.notes = formData.notes;
      }

      await api.post('/maintenance/work-orders', payload);
      router.push('/maintenance');
    } catch (err: any) {
      console.error('Error creating work order:', err);
      let errorMessage = 'Error al crear la orden de trabajo';
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

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Nueva Orden de Trabajo</h1>
        <p className="mt-2 text-gray-600">Registra una nueva orden de trabajo de mantenimiento</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Vehículo y Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehículo *
            </label>
            <select
              required
              value={formData.vehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar vehículo</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} - {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Mantenimiento *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PREVENTIVE">Preventivo</option>
              <option value="CORRECTIVE">Correctivo</option>
            </select>
          </div>
        </div>

        {/* Ubicación del Mantenimiento */}
        <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
          <label className="block text-sm font-semibold text-gray-800 mb-4">
            Ubicación del Mantenimiento *
          </label>
          <div className="flex gap-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="isInternal"
                checked={formData.isInternal}
                onChange={() => setFormData({ ...formData, isInternal: true, workshopId: '' })}
                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center text-gray-700 font-medium">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Interno
              </span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="isInternal"
                checked={!formData.isInternal}
                onChange={() => setFormData({ ...formData, isInternal: false })}
                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center text-gray-700 font-medium">
                <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Externo
              </span>
            </label>
          </div>

          {/* Campo condicional para Interno */}
          {formData.isInternal && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Mantenimiento realizado en taller interno
              </p>
            </div>
          )}

          {/* Campo condicional para Externo */}
          {!formData.isInternal && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Taller Externo *
              </label>
              <div className="flex gap-2">
                <select
                  required={!formData.isInternal}
                  value={formData.workshopId}
                  onChange={(e) => setFormData({ ...formData, workshopId: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar taller</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.contactPerson ? `- ${w.contactPerson}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowWorkshopModal(true)}
                  title="Agregar nuevo taller"
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fecha Programada */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Programada
          </label>
          <input
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Odómetro y Horómetro */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-4">Lecturas Iniciales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Odómetro (Km)
              </label>
              <input
                type="number"
                min="0"
                value={formData.odometerAtStart}
                onChange={(e) => setFormData({ ...formData, odometerAtStart: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horómetro (Horas)
              </label>
              <input
                type="number"
                min="0"
                value={formData.hourmeterAtStart}
                onChange={(e) => setFormData({ ...formData, hourmeterAtStart: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 2500"
              />
            </div>
          </div>
        </div>

        {/* Operador y Supervisor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operador
            </label>
            <select
              value={formData.operatorId}
              onChange={(e) => setFormData({ ...formData, operatorId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar operador (opcional)</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.firstName} {op.lastName} ({op.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supervisor
            </label>
            <select
              value={formData.supervisorId}
              onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar supervisor (opcional)</option>
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.firstName} {sup.lastName} ({sup.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sugerencia de Mantenimiento */}
        {formData.type === 'PREVENTIVE' && formData.vehicleId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              📋 Sugerencia de Mantenimiento según Kilometraje
            </h3>
            
            {loadingSuggestion ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-blue-700">Cargando sugerencias...</span>
              </div>
            ) : suggestion ? (
              <div className="space-y-4">
                {/* Intervalos próximos */}
                {suggestion.nextIntervals && suggestion.nextIntervals.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-2">Intervalos Sugeridos:</h4>
                    <div className="space-y-2">
                      {suggestion.nextIntervals.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-md ${
                            item.isDue ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {item.isDue ? '⚠️ VENCIDO' : '⏰ PRÓXIMO'}: {item.interval.hours.toLocaleString()}h / {item.interval.kilometers.toLocaleString()}km
                            </span>
                            {!item.isDue && (
                              <span className="text-sm">
                                Faltan: {Math.round(item.hoursUntilNext)}h / {Math.round(item.kmUntilNext)}km
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actividades sugeridas */}
                {suggestion.applicableActivities && suggestion.applicableActivities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-2">
                      Actividades Sugeridas ({suggestion.applicableActivities.length}):
                    </h4>
                    <div className="bg-white rounded-md p-3 max-h-60 overflow-y-auto">
                      <div className="space-y-1 text-sm">
                        {suggestion.applicableActivities.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-2 py-1">
                            <span className="text-blue-600">✓</span>
                            <span>
                              <strong>{activity.code}</strong> - {activity.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      💡 Estas actividades se agregarán automáticamente a la orden de trabajo
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-blue-700 text-sm">
                ℹ️ No hay plan de mantenimiento activo o no hay mantenimientos pendientes para este vehículo.
              </p>
            )}
          </div>
        )}

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones / Notas
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Ej: Mantenimiento preventivo programado según plan..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Orden de Trabajo'}
          </button>
        </div>
      </form>

      {/* Modal para agregar taller */}
      {showWorkshopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Agregar Nuevo Taller</h2>
                <button
                  onClick={() => setShowWorkshopModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateWorkshop} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Taller *
                </label>
                <input
                  type="text"
                  required
                  value={workshopForm.name}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Taller Mecánico ABC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Persona de Contacto
                </label>
                <input
                  type="text"
                  value={workshopForm.contactPerson}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, contactPerson: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={workshopForm.phone}
                    onChange={(e) => setWorkshopForm({ ...workshopForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: +593 99 999 9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={workshopForm.email}
                    onChange={(e) => setWorkshopForm({ ...workshopForm, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: contacto@taller.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={workshopForm.address}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Av. Principal 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={workshopForm.notes}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Especializado en motores diésel"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowWorkshopModal(false)}
                  disabled={savingWorkshop}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWorkshop}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {savingWorkshop ? 'Guardando...' : 'Guardar Taller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
