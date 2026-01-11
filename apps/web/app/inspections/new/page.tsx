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

interface Template {
  id: string;
  name: string;
  description?: string;
}

export default function NewInspectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [formData, setFormData] = useState({
    vehicleId: '',
    templateId: '',
    inspectionDate: '',
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
      setLoadingData(true);

      // Cargar vehículos
      const vehiclesRes = await api.get('/vehicles?page=1&limit=100');
      setVehicles(vehiclesRes.data.data || []);

      // Cargar templates
      try {
        const templatesRes = await api.get('/inspections/templates');
        setTemplates(templatesRes.data || []);
      } catch (e) {
        console.log('No se pudieron cargar templates:', e);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Error al cargar los datos. Por favor, intenta nuevamente.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        vehicleId: formData.vehicleId,
      };

      if (formData.templateId) {
        payload.templateId = formData.templateId;
      }
      if (formData.inspectionDate) {
        payload.inspectionDate = new Date(formData.inspectionDate).toISOString();
      }
      if (formData.notes) {
        payload.notes = formData.notes;
      }

      const response = await api.post('/inspections', payload);
      router.push(`/inspections/${response.data.id}`);
    } catch (err: any) {
      console.error('Error creating inspection:', err);
      let errorMessage = 'Error al crear la inspección';
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
        <h1 className="text-3xl font-bold text-gray-900">Nueva Inspección</h1>
        <p className="mt-2 text-gray-600">Registra una nueva inspección de vehículo</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Vehículo */}
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

        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template (Opcional)
          </label>
          <select
            value={formData.templateId}
            onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin template (usar checklist estándar)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.description ? `- ${t.description}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Si seleccionas un template, se crearán los items automáticamente desde el template.
          </p>
        </div>

        {/* Fecha de Inspección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Inspección
          </label>
          <input
            type="datetime-local"
            value={formData.inspectionDate}
            onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Si no especificas una fecha, se usará la fecha actual.
          </p>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Ej: Inspección pre-viaje, revisión general..."
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
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Inspección'}
          </button>
        </div>
      </form>
    </div>
  );
}
