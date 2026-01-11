'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

interface InspectionItem {
  id: string;
  section: string;
  itemName: string;
  status: string | null;
  observations?: string;
  photosUrls?: string[];
}

interface Inspection {
  id: string;
  number: string;
  status: string;
  inspectionDate: string;
  notes?: string;
  vehicle: {
    id: string;
    plate: string;
    brand: string;
    model: string;
  };
  inspector: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  template?: {
    id: string;
    name: string;
  };
  items: InspectionItem[];
  itemsBySection?: Record<string, InspectionItem[]>;
}

export default function ExecuteInspectionPage() {
  const router = useRouter();
  const params = useParams();
  const inspectionId = params.id as string;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemFormData, setItemFormData] = useState({
    status: '',
    observations: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadInspection();
  }, [router, inspectionId]);

  const loadInspection = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/inspections/${inspectionId}`);
      setInspection(response.data);
      
      // Si está pendiente, cambiar a en progreso
      if (response.data.status === 'PENDING') {
        // El backend no tiene endpoint para cambiar a IN_PROGRESS, así que lo hacemos implícito al editar items
      }
    } catch (err: any) {
      console.error('Error loading inspection:', err);
      setError('Error al cargar la inspección');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: InspectionItem) => {
    setEditingItem(item.id);
    setItemFormData({
      status: item.status || '',
      observations: item.observations || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setItemFormData({
      status: '',
      observations: '',
    });
  };

  const handleSaveItem = async (itemId: string) => {
    try {
      setSaving(true);
      setError('');
      const payload: any = {};
      
      if (itemFormData.status) payload.status = itemFormData.status;
      if (itemFormData.observations) payload.observations = itemFormData.observations;

      await api.patch(`/inspections/${inspectionId}/items/${itemId}`, payload);
      setEditingItem(null);
      await loadInspection(); // Recargar para actualizar datos
    } catch (err: any) {
      console.error('Error updating item:', err);
      setError('Error al actualizar el item');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteInspection = async () => {
    if (!confirm('¿Está seguro de completar esta inspección? No podrá editarla después.')) return;

    try {
      setSaving(true);
      setError('');
      await api.post(`/inspections/${inspectionId}/complete`);
      router.push(`/inspections/${inspectionId}`);
    } catch (err: any) {
      console.error('Error completing inspection:', err);
      setError('Error al completar la inspección');
    } finally {
      setSaving(false);
    }
  };

  const getItemStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    switch (status) {
      case 'REVISION':
        return 'bg-blue-100 text-blue-800';
      case 'MANTENIMIENTO':
        return 'bg-yellow-100 text-yellow-800';
      case 'CAMBIO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getItemStatusLabel = (status: string | null) => {
    if (!status) return 'Pendiente';
    switch (status) {
      case 'REVISION':
        return 'Revisión';
      case 'MANTENIMIENTO':
        return 'Mantenimiento';
      case 'CAMBIO':
        return 'Cambio';
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

  if (error && !inspection) {
    return (
      <div className="max-w-7xl mx-auto">
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

  if (!inspection) {
    return null;
  }

  if (inspection.status === 'COMPLETED') {
    return (
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">Esta inspección ya está completada</p>
          <button
            onClick={() => router.push(`/inspections/${inspectionId}`)}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Ver Detalle
          </button>
        </div>
      </div>
    );
  }

  const itemsBySection = inspection.itemsBySection || {};
  const sections = Object.keys(itemsBySection);
  const itemsCompleted = inspection.items.filter(item => item.status !== null).length;
  const totalItems = inspection.items.length;

  return (
    <div className="max-w-7xl mx-auto">
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
            <h1 className="text-3xl font-bold text-gray-900">Ejecutar Inspección #{inspection.number}</h1>
            <p className="text-gray-600 mt-1">
              {inspection.vehicle.plate} - {inspection.vehicle.brand} {inspection.vehicle.model}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Progreso: {itemsCompleted} de {totalItems} items completados
            </p>
          </div>
          <button
            onClick={handleCompleteInspection}
            disabled={saving || itemsCompleted === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Completando...' : 'Completar Inspección'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Checklist por Secciones */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Checklist de Inspección</h2>

        {sections.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay items registrados</p>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{section}</h3>
                <div className="space-y-3">
                  {itemsBySection[section].map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        editingItem === item.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {editingItem === item.id ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Item: {item.itemName}
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Estado *
                            </label>
                            <select
                              value={itemFormData.status}
                              onChange={(e) => setItemFormData({ ...itemFormData, status: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            >
                              <option value="">Seleccionar estado</option>
                              <option value="REVISION">Revisión</option>
                              <option value="MANTENIMIENTO">Mantenimiento</option>
                              <option value="CAMBIO">Cambio</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Observaciones
                            </label>
                            <textarea
                              value={itemFormData.observations}
                              onChange={(e) => setItemFormData({ ...itemFormData, observations: e.target.value })}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ej: Fuga de aceite en la junta..."
                            />
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleSaveItem(item.id)}
                              disabled={saving || !itemFormData.status}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">{item.itemName}</span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${getItemStatusColor(item.status)}`}
                              >
                                {getItemStatusLabel(item.status)}
                              </span>
                            </div>
                            {item.observations && (
                              <p className="text-sm text-gray-600 mt-1">{item.observations}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                          >
                            {item.status ? 'Editar' : 'Completar'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
