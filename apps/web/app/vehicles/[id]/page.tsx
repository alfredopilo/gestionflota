'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  vin?: string;
  type: string;
  capacity?: number;
  status: string;
  odometer: number;
  hourmeter: number;
  lastMaintenanceDate?: string;
  nextMaintenanceEstimated?: string;
  assignments?: Array<{
    id: string;
    driver: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    isActive: boolean;
    assignedAt: string;
  }>;
  trips?: Array<{
    id: string;
    origin: string;
    destination: string;
    departureDate: string;
    arrivalDate: string | null;
    status: string;
    distance: number;
  }>;
  workOrders?: Array<{
    id: string;
    number: string;
    type: string;
    status: string;
    scheduledDate: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'trips' | 'maintenance'>('info');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadVehicle();
  }, [vehicleId, router]);

  const loadVehicle = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/vehicles/${vehicleId}`);
      setVehicle(response.data);
    } catch (err: any) {
      console.error('Error loading vehicle:', err);
      setError(err.response?.data?.message || 'Error al cargar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MAINTENANCE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Activo';
      case 'MAINTENANCE':
        return 'En Mantenimiento';
      case 'INACTIVE':
        return 'Inactivo';
      default:
        return status;
    }
  };

  const getTripStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getWorkOrderStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 mb-4">{error || 'Vehículo no encontrado'}</p>
          <button
            onClick={() => router.push('/vehicles')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Volver a Vehículos
          </button>
        </div>
      </div>
    );
  }

  const activeDriver = vehicle.assignments?.find((a) => a.isActive);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/vehicles')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Volver</span>
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-5xl">🚗</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {vehicle.type}-{vehicle.plate.substring(0, 3).toUpperCase()}-{vehicle.id.substring(0, 3).toUpperCase()}
              </h1>
              <p className="text-gray-600 mt-1">Placa: {vehicle.plate}</p>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(vehicle.status)}`}
          >
            {getStatusLabel(vehicle.status)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'info'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Información General
          </button>
          <button
            onClick={() => setActiveTab('trips')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'trips'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Viajes ({vehicle.trips?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'maintenance'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mantenimiento ({vehicle.workOrders?.length || 0})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Información del Vehículo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detalles del Vehículo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Marca</label>
                <p className="text-lg font-semibold text-gray-900">{vehicle.brand}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Modelo</label>
                <p className="text-lg font-semibold text-gray-900">{vehicle.model}</p>
              </div>
              {vehicle.year && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Año</label>
                  <p className="text-lg font-semibold text-gray-900">{vehicle.year}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Tipo</label>
                <p className="text-lg font-semibold text-gray-900">{vehicle.type}</p>
              </div>
              {vehicle.vin && (
                <div>
                  <label className="text-sm font-medium text-gray-600">VIN</label>
                  <p className="text-lg font-semibold text-gray-900">{vehicle.vin}</p>
                </div>
              )}
              {vehicle.capacity && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Capacidad</label>
                  <p className="text-lg font-semibold text-gray-900">{vehicle.capacity} unidades</p>
                </div>
              )}
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-2">Horómetro</p>
                  <p className="text-4xl font-bold">{vehicle.hourmeter.toLocaleString('es-ES')}</p>
                  <p className="text-blue-100 text-sm mt-1">horas</p>
                </div>
                <div className="text-5xl opacity-50">🕐</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-2">Odómetro</p>
                  <p className="text-4xl font-bold">{vehicle.odometer.toLocaleString('es-ES')}</p>
                  <p className="text-green-100 text-sm mt-1">kilómetros</p>
                </div>
                <div className="text-5xl opacity-50">🚙</div>
              </div>
            </div>
          </div>

          {/* Conductor Asignado */}
          {activeDriver && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Conductor Asignado</h2>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold">
                  {activeDriver.driver.firstName.charAt(0)}
                  {activeDriver.driver.lastName.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {activeDriver.driver.firstName} {activeDriver.driver.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{activeDriver.driver.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Asignado: {new Date(activeDriver.assignedAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información de Fechas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fechas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Fecha de Registro</label>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(vehicle.createdAt).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Última Actualización</label>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(vehicle.updatedAt).toLocaleDateString('es-ES')}
                </p>
              </div>
              {vehicle.lastMaintenanceDate && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Último Mantenimiento</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(vehicle.lastMaintenanceDate).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trips' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Viajes</h2>
          {vehicle.trips && vehicle.trips.length > 0 ? (
            <div className="space-y-4">
              {vehicle.trips.map((trip) => (
                <div
                  key={trip.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/trips/${trip.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {trip.origin} → {trip.destination}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTripStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Salida:</span>{' '}
                      {new Date(trip.departureDate).toLocaleDateString('es-ES')}
                    </div>
                    {trip.arrivalDate && (
                      <div>
                        <span className="font-medium">Llegada:</span>{' '}
                        {new Date(trip.arrivalDate).toLocaleDateString('es-ES')}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Distancia:</span> {trip.distance} km
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay viajes registrados para este vehículo</p>
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Órdenes de Mantenimiento</h2>
            <button
              onClick={() => router.push('/maintenance/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Nueva Orden
            </button>
          </div>
          {vehicle.workOrders && vehicle.workOrders.length > 0 ? (
            <div className="space-y-4">
              {vehicle.workOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/maintenance/${order.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Orden #{order.number}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getWorkOrderStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Tipo:</span>{' '}
                      {order.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}
                    </div>
                    {order.scheduledDate && (
                      <div>
                        <span className="font-medium">Programada:</span>{' '}
                        {new Date(order.scheduledDate).toLocaleDateString('es-ES')}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Creada:</span>{' '}
                      {new Date(order.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay órdenes de mantenimiento para este vehículo</p>
          )}
        </div>
      )}
    </div>
  );
}
