'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
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

interface Trip {
  id: string;
  date: string;
  routeId?: string;
  vehicleId: string;
  trailerBodyId?: string;
  driver1Id?: string;
  driver2Id?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
  kmStart?: number;
  kmEnd?: number;
  tripType?: string;
  loadType?: string;
  returnTrip?: boolean;
  baseAmount?: number;
  extraAmount?: number;
  notes?: string;
  status?: string;
}

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailerBodies, setTrailerBodies] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    routeId: '',
    vehicleId: '',
    trailerBodyId: '',
    driver1Id: '',
    driver2Id: '',
    origin: '',
    destination: '',
    departureTime: '',
    arrivalTime: '',
    kmStart: '',
    kmEnd: '',
    tripType: 'd',
    loadType: 'BAÑERAS',
    returnTrip: false,
    baseAmount: '',
    extraAmount: '',
    notes: '',
    status: 'PENDING',
  });

  const loadAvailableVehicles = async (date: string) => {
    try {
      // Cargar carros disponibles
      const vehiclesRes = await api.get(`/trips/available-vehicles?date=${date}&category=CARRO&excludeTripId=${tripId}`);
      setVehicles(vehiclesRes.data || []);

      // Cargar cuerpos de arrastre disponibles
      const trailerBodiesRes = await api.get(`/trips/available-vehicles?date=${date}&category=CUERPO_ARRASTRE&excludeTripId=${tripId}`);
      setTrailerBodies(trailerBodiesRes.data || []);
    } catch (error) {
      console.error('Error loading available vehicles:', error);
      // Fallback: cargar todos los vehículos si falla la consulta de disponibles
      try {
        const vehiclesRes = await api.get('/vehicles?page=1&limit=100');
        const allVehicles = vehiclesRes.data.data || [];
        setVehicles(allVehicles.filter((v: Vehicle) => v.category === 'CARRO' || !v.category));
        setTrailerBodies(allVehicles.filter((v: Vehicle) => v.category === 'CUERPO_ARRASTRE'));
      } catch (e) {
        console.error('Error loading fallback vehicles:', e);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadData();
  }, [router, tripId]);

  // Recargar vehículos disponibles cuando cambie la fecha
  useEffect(() => {
    if (formData.date && !loadingData) {
      loadAvailableVehicles(formData.date);
    }
  }, [formData.date]);

  const loadData = async () => {
    try {
      setLoadingData(true);

      // Cargar datos del viaje
      const tripRes = await api.get(`/trips/${tripId}`);
      const trip: Trip = tripRes.data;

      // Cargar catálogos
      const tripDate = trip.date ? new Date(trip.date).toISOString().split('T')[0] : formData.date;
      
      const [vehiclesRes, trailerBodiesRes, driversRes, routesRes] = await Promise.all([
        api.get(`/trips/available-vehicles?date=${tripDate}&category=CARRO&excludeTripId=${tripId}`).catch(() => 
          api.get('/vehicles?page=1&limit=100').then(res => ({ data: (res.data.data || []).filter((v: Vehicle) => v.category === 'CARRO' || !v.category) }))
        ),
        api.get(`/trips/available-vehicles?date=${tripDate}&category=CUERPO_ARRASTRE&excludeTripId=${tripId}`).catch(() =>
          api.get('/vehicles?page=1&limit=100').then(res => ({ data: (res.data.data || []).filter((v: Vehicle) => v.category === 'CUERPO_ARRASTRE') }))
        ),
        api.get('/admin/users?page=1&limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/routes?page=1&limit=100').catch(() => ({ data: { data: [] } })),
      ]);

      setVehicles(vehiclesRes.data || []);
      setTrailerBodies(trailerBodiesRes.data || []);
      
      const responseData = driversRes.data?.data || driversRes.data || [];
      const usersArray = Array.isArray(responseData) ? responseData : [];
      setDrivers(
        usersArray.filter(
          (u: any) =>
            u.isActive !== false &&
            (u.roles?.includes('CONDUCTOR') || !u.roles || u.roles.length === 0),
        ),
      );

      setRoutes(routesRes.data.data || []);

      // Formatear datos del viaje para el formulario
      const formatTime = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      };

      setFormData({
        date: trip.date ? new Date(trip.date).toISOString().split('T')[0] : '',
        routeId: trip.routeId || '',
        vehicleId: trip.vehicleId || '',
        trailerBodyId: trip.trailerBodyId || '',
        driver1Id: trip.driver1Id || '',
        driver2Id: trip.driver2Id || '',
        origin: trip.origin || '',
        destination: trip.destination || '',
        departureTime: formatTime(trip.departureTime),
        arrivalTime: formatTime(trip.arrivalTime),
        kmStart: trip.kmStart?.toString() || '',
        kmEnd: trip.kmEnd?.toString() || '',
        tripType: trip.tripType || 'd',
        loadType: trip.loadType || 'BAÑERAS',
        returnTrip: trip.returnTrip || false,
        baseAmount: trip.baseAmount?.toString() || '',
        extraAmount: trip.extraAmount?.toString() || '',
        notes: trip.notes || '',
        status: trip.status || 'PENDING',
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error al cargar los datos del viaje');
    } finally {
      setLoadingData(false);
    }
  };

  const handleRouteChange = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (route) {
      setFormData({
        ...formData,
        routeId,
        origin: route.origin,
        destination: route.destination,
      });
    } else {
      setFormData({ ...formData, routeId: '', origin: '', destination: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        date: formData.date,
        vehicleId: formData.vehicleId,
      };

      if (formData.trailerBodyId) {
        payload.trailerBodyId = formData.trailerBodyId;
      } else {
        payload.trailerBodyId = null;
      }
      if (formData.routeId) payload.routeId = formData.routeId;
      if (formData.driver1Id) payload.driver1Id = formData.driver1Id;
      if (formData.driver2Id) payload.driver2Id = formData.driver2Id;
      if (formData.origin) payload.origin = formData.origin;
      if (formData.destination) payload.destination = formData.destination;
      if (formData.departureTime)
        payload.departureTime = new Date(`${formData.date}T${formData.departureTime}`).toISOString();
      if (formData.arrivalTime)
        payload.arrivalTime = new Date(`${formData.date}T${formData.arrivalTime}`).toISOString();
      if (formData.kmStart) payload.kmStart = Number(formData.kmStart);
      if (formData.kmEnd) payload.kmEnd = Number(formData.kmEnd);
      if (formData.tripType) payload.tripType = formData.tripType;
      if (formData.loadType) payload.loadType = formData.loadType;
      if (formData.returnTrip !== undefined) payload.returnTrip = formData.returnTrip;
      if (formData.baseAmount) payload.baseAmount = Number(formData.baseAmount);
      if (formData.extraAmount) payload.extraAmount = Number(formData.extraAmount);
      if (formData.notes) payload.notes = formData.notes;
      if (formData.status) payload.status = formData.status;

      await api.patch(`/trips/${tripId}`, payload);
      router.push('/trips');
    } catch (err: any) {
      console.error('Error updating trip:', err);
      let errorMessage = 'Error al actualizar el viaje';
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

  const calculateKmTotal = () => {
    if (formData.kmStart && formData.kmEnd) {
      const total = Number(formData.kmEnd) - Number(formData.kmStart);
      return total > 0 ? total : 0;
    }
    return 0;
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
        <h1 className="text-3xl font-bold text-gray-900">Editar Viaje</h1>
        <p className="mt-2 text-gray-600">Modifica los datos del viaje</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado del Viaje
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PENDING">Pendiente</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>

        {/* Fecha y Vehículo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del Viaje *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Carro *
            </label>
            <select
              required
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar carro</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} - {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cuerpo de Arrastre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cuerpo de Arrastre (Opcional)
          </label>
          <select
            value={formData.trailerBodyId}
            onChange={(e) => setFormData({ ...formData, trailerBodyId: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar cuerpo de arrastre (opcional)</option>
            {trailerBodies.map((tb) => (
              <option key={tb.id} value={tb.id}>
                {tb.plate} - {tb.brand} {tb.model} ({tb.type})
              </option>
            ))}
          </select>
          {trailerBodies.length === 0 && formData.date && (
            <p className="mt-1 text-sm text-gray-500">No hay cuerpos de arrastre disponibles para esta fecha</p>
          )}
        </div>

        {/* Ruta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ruta
          </label>
          <select
            value={formData.routeId}
            onChange={(e) => handleRouteChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar ruta (opcional)</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.origin} → {r.destination})
              </option>
            ))}
          </select>
        </div>

        {/* Origen y Destino */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origen *
            </label>
            <input
              type="text"
              required
              value={formData.origin}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              placeholder="Ej: Planta La Fabril - Manta"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destino *
            </label>
            <input
              type="text"
              required
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="Ej: Bodega Quito"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conductores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conductor Principal
            </label>
            <select
              value={formData.driver1Id}
              onChange={(e) => setFormData({ ...formData, driver1Id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar conductor</option>
              {Array.isArray(drivers) && drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conductor Secundario (Opcional)
            </label>
            <select
              value={formData.driver2Id}
              onChange={(e) => setFormData({ ...formData, driver2Id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar conductor</option>
              {Array.isArray(drivers) && drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Horarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Salida
            </label>
            <input
              type="time"
              value={formData.departureTime}
              onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hora de Llegada
            </label>
            <input
              type="time"
              value={formData.arrivalTime}
              onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Kilómetros */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-4">Kilometraje</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Km Inicial
              </label>
              <input
                type="number"
                min="0"
                value={formData.kmStart}
                onChange={(e) => setFormData({ ...formData, kmStart: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Km Final
              </label>
              <input
                type="number"
                min="0"
                value={formData.kmEnd}
                onChange={(e) => setFormData({ ...formData, kmEnd: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Km Recorridos
              </label>
              <div className="w-full px-4 py-3 bg-gray-200 rounded-lg font-semibold text-gray-900">
                {calculateKmTotal().toLocaleString('es-ES')} km
              </div>
            </div>
          </div>
        </div>

        {/* Tipo de Viaje y Carga */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Viaje
            </label>
            <select
              value={formData.tripType}
              onChange={(e) => setFormData({ ...formData, tripType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="d">Diario (d)</option>
              <option value="a">Alterno (a)</option>
              <option value="m">Mensual (m)</option>
              <option value="c">Continuo (c)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Carga
            </label>
            <select
              value={formData.loadType}
              onChange={(e) => setFormData({ ...formData, loadType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BAÑERAS">Bañeras</option>
              <option value="CONTENEDORES">Contenedores</option>
              <option value="TANQUEROS">Tanqueros</option>
            </select>
          </div>
        </div>

        {/* Montos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto Base
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.baseAmount}
              onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto Extra
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.extraAmount}
              onChange={(e) => setFormData({ ...formData, extraAmount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observaciones / Notas
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Ej: Viaje sin novedades"
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
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 hover:shadow-lg disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Actualizar Viaje'}
          </button>
        </div>
      </form>
    </div>
  );
}
