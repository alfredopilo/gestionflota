'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface WorkOrder {
  id: string;
  number: string;
  type: string;
  status: string;
  vehicle: {
    id: string;
    plate: string;
  };
  odometerAtStart?: number;
  hourmeterAtStart?: number;
  createdAt: string;
  completedAt?: string;
}

export default function MaintenancePage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadWorkOrders();
  }, [router, currentPage]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/maintenance/work-orders?page=${currentPage}&limit=20`);
      setWorkOrders(response.data.data || []);
      setTotalPages(response.data.meta?.totalPages || response.data.totalPages || 1);
    } catch (error: any) {
      console.error('Error loading work orders:', error);
      setError('Error al cargar las órdenes de trabajo. Por favor, intenta nuevamente.');
      // Mostrar mensaje de error al usuario
      if (error.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    const reason = prompt(`¿Por qué deseas cancelar la orden ${orderNumber}?`);
    if (reason === null) return; // Usuario canceló el prompt

    try {
      await api.post(`/maintenance/work-orders/${orderId}/cancel`, { reason });
      loadWorkOrders(); // Recargar lista
      alert('Orden cancelada exitosamente');
    } catch (err: any) {
      console.error('Error canceling order:', err);
      alert(err.response?.data?.message || 'Error al cancelar la orden');
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`¿Está seguro de eliminar permanentemente la orden ${orderNumber}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await api.delete(`/maintenance/work-orders/${orderId}`);
      loadWorkOrders(); // Recargar lista
      alert('Orden eliminada exitosamente');
    } catch (err: any) {
      console.error('Error deleting order:', err);
      alert(err.response?.data?.message || 'Error al eliminar la orden');
    }
  };

  if (loading && workOrders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Mantenimientos</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/maintenance/plans')}
            className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 transition-all duration-200 hover:shadow-lg hover:scale-105 transform flex items-center space-x-2"
          >
            <span>📋</span>
            <span>Planes</span>
          </button>
          <button
            onClick={() => router.push('/maintenance/plans/import')}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-all duration-200 hover:shadow-lg hover:scale-105 transform flex items-center space-x-2"
          >
            <span>📥</span>
            <span>Importar Plan</span>
          </button>
          <button
            onClick={() => router.push('/maintenance/new')}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105 transform flex items-center space-x-2"
          >
            <span>+</span>
            <span>Nueva Orden</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg bg-white shadow-lg overflow-hidden transition-shadow duration-300 hover:shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Fecha Creación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No hay órdenes de trabajo
                  </td>
                </tr>
              ) : (
                workOrders.map((order, index) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-blue-50 transition-all duration-200 cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => router.push(`/maintenance/${order.id}`)}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {order.number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {order.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {order.vehicle.plate}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                          order.status === 'PENDING'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'IN_PROGRESS'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status === 'PENDING'
                          ? 'Pendiente'
                          : order.status === 'IN_PROGRESS'
                          ? 'En Proceso'
                          : order.status === 'COMPLETED'
                          ? 'Completada'
                          : order.status === 'CANCELLED'
                          ? 'Cancelada'
                          : order.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/maintenance/${order.id}`);
                        }}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                      >
                        Ver
                      </button>
                      {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/maintenance/${order.id}/execute`);
                          }}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200"
                        >
                          Ejecutar
                        </button>
                      )}
                      {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelOrder(order.id, order.number);
                          }}
                          className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors duration-200"
                          title="Cancelar orden"
                        >
                          Cancelar
                        </button>
                      )}
                      {(order.status === 'PENDING' || order.status === 'CANCELLED') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id, order.number);
                          }}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-200"
                          title="Eliminar orden"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
