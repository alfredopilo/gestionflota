'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import VehicleModal from '@/components/VehicleModal';

interface Vehicle {
  id?: string;
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
    };
    isActive: boolean;
  }>;
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadVehicles();
  }, [router, currentPage]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/vehicles?page=${currentPage}&limit=50`);
      const vehiclesData = response.data.data || [];
      
      // Cargar detalles completos de cada vehículo para obtener asignaciones
      const vehiclesWithDetails = await Promise.all(
        vehiclesData.map(async (vehicle: Vehicle) => {
          try {
            if (!vehicle.id) return vehicle;
            const detailResponse = await api.get(`/vehicles/${vehicle.id}`);
            return detailResponse.data;
          } catch {
            return vehicle;
          }
        })
      );
      
      setVehicles(vehiclesWithDetails);
      setTotalPages(response.data.meta?.totalPages || 1);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleSave = async (vehicle: Vehicle) => {
    try {
      const payload: any = {
        plate: vehicle.plate?.trim(),
        brand: vehicle.brand?.trim(),
        model: vehicle.model?.trim(),
        type: vehicle.type,
        status: vehicle.status,
        odometer: Number(vehicle.odometer) || 0,
        hourmeter: Number(vehicle.hourmeter) || 0,
      };

      if (vehicle.year) payload.year = Number(vehicle.year);
      if (vehicle.vin?.trim()) payload.vin = vehicle.vin.trim();
      if (vehicle.capacity && vehicle.capacity > 0) {
        payload.capacity = String(vehicle.capacity);
      }

      if (vehicle.id) {
        await api.patch(`/vehicles/${vehicle.id}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      loadVehicles();
    } catch (error: any) {
      console.error('Error guardando vehículo:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Está seguro de eliminar este vehículo?')) return;

    try {
      await api.delete(`/vehicles/${id}`);
      loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Error al eliminar el vehículo');
    }
  };

  const handleViewDetails = (id: string) => {
    router.push(`/vehicles/${id}`);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '??';
  };

  const getDriverName = (vehicle: Vehicle) => {
    const activeAssignment = vehicle.assignments?.find(a => a.isActive);
    if (activeAssignment?.driver) {
      return `${activeAssignment.driver.firstName} ${activeAssignment.driver.lastName}`;
    }
    return 'Sin asignar';
  };

  const getDriverInitials = (vehicle: Vehicle) => {
    const activeAssignment = vehicle.assignments?.find(a => a.isActive);
    if (activeAssignment?.driver) {
      return getInitials(activeAssignment.driver.firstName, activeAssignment.driver.lastName);
    }
    return 'SA';
  };

  const getMaintenanceProgress = (vehicle: Vehicle) => {
    // Cálculo simplificado - deberías obtener esto del backend
    // Por ahora retornamos un valor estimado
    const currentHours = Number(vehicle.hourmeter) || 0;
    const nextMaintenanceHours = 1000; // Intervalo estándar
    const remaining = nextMaintenanceHours - (currentHours % nextMaintenanceHours);
    const progress = ((currentHours % nextMaintenanceHours) / nextMaintenanceHours) * 100;
    
    return {
      remaining,
      progress: Math.min(progress, 100),
      isUrgent: remaining < 100,
    };
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      !searchTerm ||
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDriverName(v).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' || 
      v.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  if (loading && vehicles.length === 0) {
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
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Flota</h1>
        <p className="mt-2 text-gray-600">Administra todos los vehículos de la empresa</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="🔍 Buscar por código, placa o conductor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
          </div>
          <button
            onClick={handleCreate}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 transform"
          >
            + Nuevo Vehículo
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex space-x-2">
          {[
            { value: 'ALL', label: 'Todos' },
            { value: 'ACTIVE', label: 'Activo' },
            { value: 'MAINTENANCE', label: 'En Mantenimiento' },
            { value: 'INACTIVE', label: 'Inactivo' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                statusFilter === tab.value
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-500 text-lg">No hay vehículos registrados</p>
          </div>
        ) : (
          filteredVehicles.map((vehicle, index) => {
            const maintenance = getMaintenanceProgress(vehicle);
            const driverName = getDriverName(vehicle);
            const driverInitials = getDriverInitials(vehicle);
            
            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => vehicle.id && handleViewDetails(vehicle.id)}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">🚗</div>
                    <div>
                      <div className="font-bold text-lg text-gray-900">
                        {vehicle.type}-{vehicle.plate.substring(0, 3).toUpperCase()}-{vehicle.id?.substring(0, 3).toUpperCase() || 'NEW'}
                      </div>
                      <div className="text-sm text-gray-600">{vehicle.plate}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(vehicle.status)}`}
                    >
                      {getStatusLabel(vehicle.status)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(vehicle);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ⋮
                    </button>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Modelo:</span>
                    <span className="text-sm font-semibold text-gray-900">{vehicle.brand} {vehicle.model}</span>
                  </div>
                  {vehicle.year && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Año:</span>
                      <span className="text-sm font-semibold text-gray-900">{vehicle.year}</span>
                    </div>
                  )}
                </div>

                {/* Driver */}
                <div className="mb-4 flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {driverInitials}
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Conductor asignado</div>
                    <div className="text-sm font-semibold text-gray-900">{driverName}</div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🕐</span>
                    <div>
                      <div className="text-xs text-gray-600">Horómetro</div>
                      <div className="text-lg font-bold text-gray-900">
                        {Number(vehicle.hourmeter).toLocaleString('es-ES')}h
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🚙</span>
                    <div>
                      <div className="text-xs text-gray-600">Kilómetros</div>
                      <div className="text-lg font-bold text-gray-900">
                        {Number(vehicle.odometer).toLocaleString('es-ES')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Maintenance Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🔧</span>
                      <span className="text-sm font-medium text-gray-700">Próximo mantenimiento</span>
                    </div>
                    <span className={`text-xs font-semibold ${maintenance.isUrgent ? 'text-orange-600' : 'text-green-600'}`}>
                      {maintenance.remaining}h restantes
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        maintenance.isUrgent ? 'bg-orange-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${maintenance.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Last Maintenance */}
                {vehicle.lastMaintenanceDate && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>📅</span>
                    <span>Último mantenimiento: {new Date(vehicle.lastMaintenanceDate).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-gray-700">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      )}

      <VehicleModal
        vehicle={selectedVehicle}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
