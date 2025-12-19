'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

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
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
  };
  items: WorkOrderItem[];
}

export default function ExecuteWorkOrderPage() {
  const router = useRouter();
  const params = useParams();
  const workOrderId = params.id as string;
  
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemFormData, setItemFormData] = useState({
    status: '',
    observations: '',
    partsUsed: '',
    laborHours: '',
    cost: '',
  });

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
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkOrder = async () => {
    try {
      setSaving(true);
      setError('');
      await api.post(`/maintenance/work-orders/${workOrderId}/start`);
      await loadWorkOrder(); // Recargar para actualizar estado
    } catch (err: any) {
      console.error('Error starting work order:', err);
      setError('Error al iniciar la orden de trabajo');
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = (item: WorkOrderItem) => {
    setEditingItem(item.id);
    setItemFormData({
      status: item.status,
      observations: item.observations || '',
      partsUsed: item.partsUsed || '',
      laborHours: item.laborHours?.toString() || '',
      cost: item.cost?.toString() || '',
    });
  };

  const handleSaveItem = async (itemId: string) => {
    try {
      setSaving(true);
      setError('');
      const payload: any = {};
      
      if (itemFormData.status) payload.status = itemFormData.status;
      if (itemFormData.observations) payload.observations = itemFormData.observations;
      if (itemFormData.partsUsed) payload.partsUsed = itemFormData.partsUsed;
      if (itemFormData.laborHours) payload.laborHours = Number(itemFormData.laborHours);
      if (itemFormData.cost) payload.cost = Number(itemFormData.cost);

      await api.patch(`/maintenance/work-orders/${workOrderId}/items/${itemId}`, payload);
      setEditingItem(null);
      await loadWorkOrder(); // Recargar para actualizar datos
    } catch (err: any) {
      console.error('Error updating item:', err);
      setError('Error al actualizar el item');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseWorkOrder = async () => {
    if (!confirm('¿Está seguro de cerrar esta orden de trabajo?')) return;

    try {
      setSaving(true);
      setError('');
      const notes = prompt('Ingrese notas finales (opcional):') || '';
      await api.post(`/maintenance/work-orders/${workOrderId}/close`, { notes });
      router.push(`/maintenance/${workOrderId}`);
    } catch (err: any) {
      console.error('Error closing work order:', err);
      setError('Error al cerrar la orden de trabajo');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  const allItemsCompleted = workOrder?.items.every(item => item.status === 'COMPLETED' || item.status === 'SKIPPED');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !workOrder) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/maintenance/${workOrderId}`)}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver a Detalles
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ejecutar Orden {workOrder.number}</h1>
            <p className="mt-2 text-gray-600">
              Vehículo: {workOrder.vehicle.plate} - {workOrder.vehicle.brand} {workOrder.vehicle.model}
            </p>
          </div>
          <div className="flex space-x-3">
            {workOrder.status === 'PENDING' && (
              <button
                onClick={handleStartWorkOrder}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Iniciando...' : 'Iniciar Orden'}
              </button>
            )}
            {workOrder.status === 'IN_PROGRESS' && allItemsCompleted && (
              <button
                onClick={handleCloseWorkOrder}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Cerrando...' : 'Cerrar Orden'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {workOrder.status === 'PENDING' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <p className="font-semibold">⚠️ Orden Pendiente</p>
          <p className="text-sm mt-1">Debe iniciar la orden antes de poder ejecutar los items de mantenimiento.</p>
        </div>
      )}

      {/* Items de Mantenimiento */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Items de Mantenimiento ({workOrder.items.length})
        </h2>
        {workOrder.items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No hay items de mantenimiento registrados para esta orden.
          </p>
        ) : (
          <div className="space-y-4">
            {workOrder.items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {editingItem === item.id ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {item.activity?.code || 'N/A'} - {item.activity?.name || 'Sin actividad'}
                      </h3>
                      {item.activity?.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.activity.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estado *
                        </label>
                        <select
                          value={itemFormData.status}
                          onChange={(e) => setItemFormData({ ...itemFormData, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="PENDING">Pendiente</option>
                          <option value="IN_PROGRESS">En Proceso</option>
                          <option value="COMPLETED">Completado</option>
                          <option value="SKIPPED">Omitido</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Horas de Trabajo
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={itemFormData.laborHours}
                          onChange={(e) => setItemFormData({ ...itemFormData, laborHours: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Costo
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={itemFormData.cost}
                          onChange={(e) => setItemFormData({ ...itemFormData, cost: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Repuestos Utilizados
                        </label>
                        <input
                          type="text"
                          value={itemFormData.partsUsed}
                          onChange={(e) => setItemFormData({ ...itemFormData, partsUsed: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ej: Filtro de aceite, bujías..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observaciones
                      </label>
                      <textarea
                        value={itemFormData.observations}
                        onChange={(e) => setItemFormData({ ...itemFormData, observations: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ingrese observaciones sobre este item..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveItem(item.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={saving}
                      >
                        {saving ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">
                          {item.activity?.code || 'N/A'} - {item.activity?.name || 'Sin actividad'}
                        </h3>
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold ${getStatusColor(item.status)}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      {item.activity?.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.activity.description}</p>
                      )}
                      {item.observations && (
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="font-medium">Observaciones:</span> {item.observations}
                        </p>
                      )}
                      {item.partsUsed && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-medium">Repuestos:</span> {item.partsUsed}
                        </p>
                      )}
                      <div className="flex space-x-4 mt-2 text-sm text-gray-600">
                        {item.laborHours && (
                          <span>Horas: {item.laborHours}h</span>
                        )}
                        {item.cost && (
                          <span>Costo: ${item.cost.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                    </div>
                    {workOrder.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleEditItem(item)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
