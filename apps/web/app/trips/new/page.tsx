'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
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

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    routeId: '',
    vehicleId: '',
    driver1Id: '',
    driver2Id: '',
    origin: '',
    destination: '',
    departureTime: '',
    arrivalTime: '',
    kmStart: '',
    kmEnd: '',
    tripType: 'd', // d/a/m/c
    loadType: 'BAÑERAS',
    returnTrip: false,
    baseAmount: '',
    extraAmount: '',
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
      const vehiclesRes = await api.get('/vehicles?page=1&limit=100');
      setVehicles(vehiclesRes.data.data || []);

      // Cargar conductores desde admin/users
      try {
        const driversRes = await api.get('/admin/users?page=1&limit=100');
        const responseData = driversRes.data?.data || driversRes.data || [];
        // Asegurar que sea un array y filtrar solo usuarios activos con rol CONDUCTOR
        const usersArray = Array.isArray(responseData) ? responseData : [];
        setDrivers(
          usersArray.filter(
            (u: any) =>
              u.isActive !== false &&
              (u.roles?.includes('CONDUCTOR') || !u.roles || u.roles.length === 0),
          ),
        );
      } catch (e) {
        console.log('No se pudieron cargar conductores:', e);
        setDrivers([]);
      }

      // Cargar rutas
      try {
        const routesRes = await api.get('/routes?page=1&limit=100');
        setRoutes(routesRes.data.data || []);
      } catch (e) {
        console.log('No se pudieron cargar rutas');
        setRoutes([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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

      await api.post('/trips', payload);
      router.push('/trips');
    } catch (err: any) {
      console.error('Error creating trip:', err);
      let errorMessage = 'Error al crear el viaje';
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
        <h1 className="text-3xl font-bold text-gray-900">Nuevo Viaje</h1>
        <p className="mt-2 text-gray-600">Registra un nuevo viaje en el sistema</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
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
              Vehículo *
            </label>
            <select
              required
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
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
            {loading ? 'Guardando...' : 'Crear Viaje'}
          </button>
        </div>
      </form>
    </div>
  );
}
