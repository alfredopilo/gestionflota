'use client';

import { useState, useEffect } from 'react';

interface Vehicle {
  id?: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  vin?: string;
  type: string;
  category?: string;
  capacity?: number;
  status: string;
  odometer: number;
  hourmeter: number;
}

interface VehicleModalProps {
  vehicle?: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Vehicle) => Promise<void>;
}

export default function VehicleModal({ vehicle, isOpen, onClose, onSave }: VehicleModalProps) {
  const [formData, setFormData] = useState<Vehicle>({
    plate: '',
    brand: '',
    model: '',
    year: null,
    vin: '',
    type: 'TRUCK',
    category: 'CARRO',
    capacity: 0,
    status: 'ACTIVE',
    odometer: 0,
    hourmeter: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (vehicle) {
      setFormData({
        ...vehicle,
        category: vehicle.category || 'CARRO',
      });
    } else {
      setFormData({
        plate: '',
        brand: '',
        model: '',
        year: null,
        vin: '',
        type: 'TRUCK',
        category: 'CARRO',
        capacity: 0,
        status: 'ACTIVE',
        odometer: 0,
        hourmeter: 0,
      });
    }
    setError('');
  }, [vehicle, isOpen]);

  const handleCategoryChange = (category: string) => {
    // Resetear el tipo cuando cambia la categoría
    const defaultType = category === 'CARRO' ? 'TRUCK' : 'BAÑERAS';
    setFormData({ ...formData, category, type: defaultType });
  };

  const getTypeOptions = () => {
    if (formData.category === 'CUERPO_ARRASTRE') {
      return (
        <>
          <option value="BAÑERAS">Bañeras</option>
          <option value="CONTENEDORES">Contenedores</option>
          <option value="TANQUEROS">Tanqueros</option>
        </>
      );
    }
    // CARRO por defecto
    return (
      <>
        <option value="TRUCK">Camión</option>
        <option value="TRAILER">Remolque</option>
        <option value="VAN">Van</option>
        <option value="CAR">Automóvil</option>
        <option value="OTHER">Otro</option>
      </>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Preparar datos para envío (convertir capacity a string si es necesario)
      const dataToSend = {
        ...formData,
        capacity: formData.capacity ? String(formData.capacity) : undefined,
        year: formData.year || undefined,
        vin: formData.vin || undefined,
      };
      await onSave(dataToSend as Vehicle);
      onClose();
    } catch (err: any) {
      console.error('Error completo:', err);
      let errorMessage = 'Error al guardar el vehículo';
      
      if (err.response?.data) {
        // Si hay un array de mensajes (validación)
        if (Array.isArray(err.response.data.message)) {
          errorMessage = err.response.data.message.join(', ');
        } else if (typeof err.response.data.message === 'string') {
          errorMessage = err.response.data.message;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 animate-slide-in">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.plate}
                  onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="MAINTENANCE">En Mantenimiento</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : null })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  required
                  value={formData.category || 'CARRO'}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CARRO">Carro</option>
                  <option value="CUERPO_ARRASTRE">Cuerpo de Arrastre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getTypeOptions()}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VIN / Chasis
                </label>
                <input
                  type="text"
                  value={formData.vin || ''}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.capacity || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value ? parseFloat(e.target.value) : 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Odómetro (km) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.odometer}
                  onChange={(e) =>
                    setFormData({ ...formData, odometer: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horómetro (h) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.hourmeter}
                  onChange={(e) =>
                    setFormData({ ...formData, hourmeter: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
