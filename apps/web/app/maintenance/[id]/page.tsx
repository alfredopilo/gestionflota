'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import PrintWorkOrder from '@/components/PrintWorkOrder';

interface WorkOrderItem {
  id: string;
  status: string;
  observations?: string;
  partsUsed?: string;
  laborHours?: number;
  cost?: number;
  activity?: {
    id: string;
    code: string;
    name: string;
    description?: string;
  };
}

interface WorkOrder {
  id: string;
  number: string;
  type: string;
  status: string;
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
  odometerAtStart?: number;
  hourmeterAtStart?: number;
  totalCost?: number;
  notes?: string;
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
  };
  operator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: WorkOrderItem[];
  createdAt: string;
}

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workOrderId = params.id as string;
  
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadWorkOrder();
  }, [router, workOrderId]);

  const loadWorkOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/maintenance/work-orders/${workOrderId}`);
      setWorkOrder(response.data);
    } catch (err: any) {
      console.error('Error loading work order:', err);
      setError('Error al cargar la orden de trabajo');
      if (err.response?.status === 404) {
        setError('Orden de trabajo no encontrada');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!workOrder) return;
    
    const reason = prompt(`¿Por qué deseas cancelar la orden ${workOrder.number}?`);
    if (reason === null) return; // Usuario canceló el prompt

    try {
      await api.post(`/maintenance/work-orders/${workOrderId}/cancel`, { reason });
      await loadWorkOrder(); // Recargar orden
      alert('Orden cancelada exitosamente');
    } catch (err: any) {
      console.error('Error canceling order:', err);
      alert(err.response?.data?.message || 'Error al cancelar la orden');
    }
  };

  const handleDeleteOrder = async () => {
    if (!workOrder) return;
    
    if (!confirm(`¿Está seguro de eliminar permanentemente la orden ${workOrder.number}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await api.delete(`/maintenance/work-orders/${workOrderId}`);
      alert('Orden eliminada exitosamente');
      router.push('/maintenance');
    } catch (err: any) {
      console.error('Error deleting order:', err);
      alert(err.response?.data?.message || 'Error al eliminar la orden');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'IN_PROGRESS':
        return 'En Proceso';
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'SKIPPED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'IN_PROGRESS':
        return 'En Proceso';
      case 'COMPLETED':
        return 'Completado';
      case 'SKIPPED':
        return 'Omitido';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error || 'Orden de trabajo no encontrada'}
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orden de Trabajo {workOrder.number}</h1>
            <p className="mt-2 text-gray-600">
              {workOrder.type === 'PREVENTIVE' ? 'Mantenimiento Preventivo' : 'Mantenimiento Correctivo'}
            </p>
          </div>
          <div className="flex space-x-3">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getStatusColor(workOrder.status)}`}
            >
              {getStatusLabel(workOrder.status)}
            </span>
            <button
              onClick={() => setShowPrint(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <span>🖨️</span>
              <span>Imprimir</span>
            </button>
            {workOrder.status !== 'COMPLETED' && workOrder.status !== 'CANCELLED' && (
              <>
                <button
                  onClick={() => router.push(`/maintenance/${workOrderId}/execute`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ejecutar
                </button>
                {(workOrder.status === 'PENDING' || workOrder.status === 'IN_PROGRESS') && (
                  <button
                    onClick={() => handleCancelOrder()}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </>
            )}
            {(workOrder.status === 'PENDING' || workOrder.status === 'CANCELLED') && (
              <button
                onClick={() => handleDeleteOrder()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                🗑️ Eliminar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Información General */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Información del Vehículo</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Placa:</span>
              <span className="ml-2 font-medium">{workOrder.vehicle.plate}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Marca/Modelo:</span>
              <span className="ml-2 font-medium">{workOrder.vehicle.brand} {workOrder.vehicle.model}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Información de la Orden</h2>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Fecha Creación:</span>
              <span className="ml-2 font-medium">
                {new Date(workOrder.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {workOrder.scheduledDate && (
              <div>
                <span className="text-sm text-gray-600">Fecha Programada:</span>
                <span className="ml-2 font-medium">
                  {new Date(workOrder.scheduledDate).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {workOrder.startedAt && (
              <div>
                <span className="text-sm text-gray-600">Fecha Inicio:</span>
                <span className="ml-2 font-medium">
                  {new Date(workOrder.startedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {workOrder.completedAt && (
              <div>
                <span className="text-sm text-gray-600">Fecha Completada:</span>
                <span className="ml-2 font-medium">
                  {new Date(workOrder.completedAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lecturas y Personal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {(workOrder.odometerAtStart || workOrder.hourmeterAtStart) && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lecturas Iniciales</h2>
            <div className="space-y-2">
              {workOrder.odometerAtStart && (
                <div>
                  <span className="text-sm text-gray-600">Odómetro:</span>
                  <span className="ml-2 font-medium">{workOrder.odometerAtStart.toLocaleString('es-ES')} km</span>
                </div>
              )}
              {workOrder.hourmeterAtStart && (
                <div>
                  <span className="text-sm text-gray-600">Horómetro:</span>
                  <span className="ml-2 font-medium">{workOrder.hourmeterAtStart.toLocaleString('es-ES')} horas</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(workOrder.operator || workOrder.supervisor) && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Asignado</h2>
            <div className="space-y-2">
              {workOrder.operator && (
                <div>
                  <span className="text-sm text-gray-600">Operador:</span>
                  <span className="ml-2 font-medium">
                    {workOrder.operator.firstName} {workOrder.operator.lastName}
                  </span>
                </div>
              )}
              {workOrder.supervisor && (
                <div>
                  <span className="text-sm text-gray-600">Supervisor:</span>
                  <span className="ml-2 font-medium">
                    {workOrder.supervisor.firstName} {workOrder.supervisor.lastName}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items de Mantenimiento */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Items de Mantenimiento ({workOrder.items.length})
        </h2>
        {workOrder.items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No hay items de mantenimiento registrados para esta orden.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Actividad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Observaciones
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                    Costo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workOrder.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.activity?.code || 'N/A'} - {item.activity?.name || 'Sin actividad'}
                      </div>
                      {item.activity?.description && (
                        <div className="text-xs text-gray-500">{item.activity.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold ${getItemStatusColor(item.status)}`}
                      >
                        {getItemStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {item.observations || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.cost ? `$${item.cost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notas */}
      {workOrder.notes && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notas</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{workOrder.notes}</p>
        </div>
      )}

      {/* Costo Total */}
      {workOrder.totalCost && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Costo Total:</span>
            <span className="text-2xl font-bold text-blue-600">
              ${workOrder.totalCost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Modal de impresión */}
      {showPrint && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <PrintWorkOrder workOrder={workOrder} onClose={() => setShowPrint(false)} />
        </div>
      )}
    </div>
  );
}
