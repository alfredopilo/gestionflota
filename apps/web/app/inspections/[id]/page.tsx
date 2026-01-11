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
  createdAt: string;
  updatedAt: string;
}

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inspectionId = params.id as string;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    } catch (err: any) {
      console.error('Error loading inspection:', err);
      setError('Error al cargar la inspección');
      if (err.response?.status === 404) {
        setError('Inspección no encontrada');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (error || !inspection) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 mb-4">{error || 'Inspección no encontrada'}</p>
          <button
            onClick={() => router.push('/inspections')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Volver a Inspecciones
          </button>
        </div>
      </div>
    );
  }

  const itemsBySection = inspection.itemsBySection || {};
  const sections = Object.keys(itemsBySection);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/inspections')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Volver</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspección #{inspection.number}</h1>
            <p className="text-gray-600 mt-1">
              Vehículo: {inspection.vehicle.plate} - {inspection.vehicle.brand} {inspection.vehicle.model}
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(inspection.status)}`}
          >
            {getStatusLabel(inspection.status)}
          </span>
        </div>
      </div>

      {/* Información General */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-600">Fecha de Inspección</label>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(inspection.inspectionDate).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Inspector</label>
            <p className="text-lg font-semibold text-gray-900">
              {inspection.inspector.firstName} {inspection.inspector.lastName}
            </p>
            <p className="text-sm text-gray-500">{inspection.inspector.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Template</label>
            <p className="text-lg font-semibold text-gray-900">
              {inspection.template?.name || 'Sin template (Checklist estándar)'}
            </p>
          </div>
        </div>
        {inspection.notes && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-600">Notas</label>
            <p className="text-gray-900 mt-1">{inspection.notes}</p>
          </div>
        )}
      </div>

      {/* Checklist por Secciones */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Checklist de Inspección</h2>
          {inspection.status !== 'COMPLETED' && (
            <button
              onClick={() => router.push(`/inspections/${inspectionId}/execute`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Ejecutar Inspección
            </button>
          )}
        </div>

        {sections.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay items registrados</p>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{section}</h3>
                <div className="space-y-2">
                  {itemsBySection[section].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
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
                        {item.photosUrls && item.photosUrls.length > 0 && (
                          <div className="mt-2 flex space-x-2">
                            {item.photosUrls.map((photoUrl, idx) => (
                              <img
                                key={idx}
                                src={photoUrl}
                                alt={`Foto ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded border border-gray-300"
                              />
                            ))}
                          </div>
                        )}
                      </div>
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
