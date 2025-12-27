'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  type?: string;
  category?: string;
  odometer?: number;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
}

interface Route {
  id: string;
  code?: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm?: number | null;
  estimatedHours?: number;
}

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    tripType: 'd', // d/a/m/c
    loadType: 'BAÑERAS',
    returnTrip: false,
    baseAmount: '',
    extraAmount: '',
    notes: '',
    status: 'PENDING',
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadData();
  }, [router]);

  // Recargar vehículos disponibles cuando cambie la fecha
  useEffect(() => {
    if (formData.date) {
      loadAvailableVehicles(formData.date);
      // Limpiar selecciones al cambiar la fecha
      setFormData((prev) => ({
        ...prev,
        vehicleId: '',
        trailerBodyId: '',
      }));
    }
  }, [formData.date]);

  const loadAvailableVehicles = async (date: string) => {
    try {
      // Cargar carros disponibles
      const vehiclesRes = await api.get(`/trips/available-vehicles?date=${date}&category=CARRO`);
      setVehicles(vehiclesRes.data || []);

      // Cargar cuerpos de arrastre disponibles
      const trailerBodiesRes = await api.get(`/trips/available-vehicles?date=${date}&category=CUERPO_ARRASTRE`);
      setTrailerBodies(trailerBodiesRes.data || []);
    } catch (error) {
      console.error('Error loading available vehicles:', error);
      // Fallback: cargar todos los vehículos si falla la consulta de disponibles
      try {
        const vehiclesRes = await api.get('/vehicles?page=1&limit=100');
        const allVehicles = vehiclesRes.data.data || [];
        setVehicles(allVehicles.filter((v: Vehicle & { category?: string }) => v.category === 'CARRO' || !v.category));
        setTrailerBodies(allVehicles.filter((v: Vehicle & { category?: string }) => v.category === 'CUERPO_ARRASTRE'));
      } catch (e) {
        console.error('Error loading fallback vehicles:', e);
      }
    }
  };

  const loadData = async () => {
    try {
      // Cargar vehículos disponibles para la fecha actual
      await loadAvailableVehicles(formData.date);

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

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    let kmStart = formData.kmStart;
    
    // Establecer kmStart con el odómetro del vehículo si existe
    if (vehicle && vehicle.odometer !== undefined && vehicle.odometer !== null) {
      kmStart = String(vehicle.odometer);
    }
    
    // Recalcular kmEnd si hay ruta seleccionada
    let kmEnd = formData.kmEnd;
    if (kmStart && formData.routeId) {
      const route = routes.find((r) => r.id === formData.routeId);
      if (route && route.distanceKm) {
        const kmStartNum = Number(kmStart);
        const distanceNum = Number(route.distanceKm);
        if (!isNaN(kmStartNum) && !isNaN(distanceNum)) {
          kmEnd = String(kmStartNum + distanceNum);
        }
      }
    }
    
    setFormData({
      ...formData,
      vehicleId,
      kmStart,
      kmEnd,
    });
  };

  const handleTrailerBodyChange = (trailerBodyId: string) => {
    setFormData({
      ...formData,
      trailerBodyId,
    });
  };

  const handleRouteChange = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (route) {
      // Calcular kmEnd automáticamente si hay kmStart y distanceKm
      let kmEnd = formData.kmEnd;
      if (route.distanceKm && formData.kmStart) {
        const kmStartNum = Number(formData.kmStart);
        const distanceNum = Number(route.distanceKm);
        if (!isNaN(kmStartNum) && !isNaN(distanceNum)) {
          kmEnd = String(kmStartNum + distanceNum);
        }
      }
      setFormData({
        ...formData,
        routeId,
        origin: route.origin,
        destination: route.destination,
        kmEnd,
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

      if (formData.trailerBodyId) payload.trailerBodyId = formData.trailerBodyId;
      if (formData.routeId) payload.routeId = formData.routeId;
      if (formData.driver1Id) payload.driver1Id = formData.driver1Id;
      if (formData.driver2Id) payload.driver2Id = formData.driver2Id;
      if (formData.origin) payload.origin = formData.origin;
      if (formData.destination) payload.destination = formData.destination;
      if (formData.departureTime) {
        payload.departureTime = new Date(`${formData.date}T${formData.departureTime}`).toISOString();
      }
      if (formData.arrivalTime) {
        const departureDate = formData.departureTime 
          ? new Date(`${formData.date}T${formData.departureTime}`)
          : null;
        const arrivalDate = new Date(`${formData.date}T${formData.arrivalTime}`);
        
        // Si la hora de llegada es menor que la de salida, asumir que es del día siguiente
        if (departureDate && arrivalDate < departureDate) {
          // Agregar 1 día a la fecha de llegada
          const nextDay = new Date(arrivalDate);
          nextDay.setDate(nextDay.getDate() + 1);
          payload.arrivalTime = nextDay.toISOString();
        } else {
          payload.arrivalTime = arrivalDate.toISOString();
        }
      }
      if (formData.kmStart) payload.kmStart = Number(formData.kmStart);
      if (formData.kmEnd) payload.kmEnd = Number(formData.kmEnd);
      if (formData.tripType) payload.tripType = formData.tripType;
      if (formData.loadType) payload.loadType = formData.loadType;
      if (formData.returnTrip !== undefined) payload.returnTrip = formData.returnTrip;
      if (formData.baseAmount) payload.baseAmount = Number(formData.baseAmount);
      if (formData.extraAmount) payload.extraAmount = Number(formData.extraAmount);
      if (formData.notes) payload.notes = formData.notes;
      if (formData.status) payload.status = formData.status;

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
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar carro</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} - {v.brand} {v.model}
                  {v.odometer !== undefined && v.odometer !== null 
                    ? ` (${Number(v.odometer).toLocaleString('es-ES')} km)`
                    : ''}
                </option>
              ))}
            </select>
            {formData.vehicleId && (() => {
              const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
              return selectedVehicle && selectedVehicle.odometer !== undefined && selectedVehicle.odometer !== null ? (
                <p className="mt-1 text-sm text-gray-600">
                  Odómetro del vehículo: <span className="font-semibold">{Number(selectedVehicle.odometer).toLocaleString('es-ES')} km</span>
                </p>
              ) : null;
            })()}
          </div>
        </div>

        {/* Cuerpo de Arrastre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cuerpo de Arrastre (Opcional)
          </label>
          <select
            value={formData.trailerBodyId}
            onChange={(e) => handleTrailerBodyChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar cuerpo de arrastre (opcional)</option>
            {trailerBodies.map((tb) => (
              <option key={tb.id} value={tb.id}>
                {tb.plate} - {tb.brand} {tb.model} ({tb.type})
                {tb.odometer !== undefined && tb.odometer !== null 
                  ? ` (${Number(tb.odometer).toLocaleString('es-ES')} km)`
                  : ''}
              </option>
            ))}
          </select>
          {formData.trailerBodyId && (() => {
            const selectedTrailer = trailerBodies.find((tb) => tb.id === formData.trailerBodyId);
            return selectedTrailer && selectedTrailer.odometer !== undefined && selectedTrailer.odometer !== null ? (
              <p className="mt-1 text-sm text-gray-600">
                Odómetro del cuerpo de arrastre: <span className="font-semibold">{Number(selectedTrailer.odometer).toLocaleString('es-ES')} km</span>
              </p>
            ) : null;
          })()}
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
                Km Inicial *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.kmStart}
                onChange={(e) => {
                  const newKmStart = e.target.value;
                  // Recalcular kmEnd si hay ruta seleccionada
                  let newKmEnd = formData.kmEnd;
                  if (newKmStart && formData.routeId) {
                    const route = routes.find((r) => r.id === formData.routeId);
                    if (route && route.distanceKm) {
                      const kmStartNum = Number(newKmStart);
                      const distanceNum = Number(route.distanceKm);
                      if (!isNaN(kmStartNum) && !isNaN(distanceNum)) {
                        newKmEnd = String(kmStartNum + distanceNum);
                      }
                    }
                  }
                  setFormData({ ...formData, kmStart: newKmStart, kmEnd: newKmEnd });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Se selecciona automáticamente del vehículo"
              />
              {!formData.vehicleId && (
                <p className="mt-1 text-xs text-gray-500">Selecciona un vehículo para llenar automáticamente</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Km Final *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.kmEnd}
                onChange={(e) => setFormData({ ...formData, kmEnd: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Se calcula automáticamente con la ruta"
              />
              {!formData.routeId && formData.kmStart && (
                <p className="mt-1 text-xs text-gray-500">Selecciona una ruta para calcular automáticamente</p>
              )}
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
