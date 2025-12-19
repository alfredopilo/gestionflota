'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ImportPlanPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [vehicleType, setVehicleType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.includes('spreadsheet') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
      setFile(droppedFile);
      handleFilePreview(droppedFile);
    } else {
      setError('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleFilePreview(selectedFile);
    }
  };

  const handleFilePreview = async (file: File) => {
    try {
      setError('');
      // Aquí podrías leer el archivo con una librería como xlsx para mostrar preview
      // Por ahora solo mostramos información básica
      setPreview({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Error al leer el archivo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Por favor, selecciona un archivo');
      return;
    }

    if (!vehicleType) {
      setError('Por favor, selecciona el tipo de vehículo');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('vehicleType', vehicleType);

      const response = await api.post('/maintenance/plan/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Mostrar resumen
      alert(
        `Plan importado exitosamente!\n\n` +
        `Intervalos: ${response.data.summary?.intervalsCount || 0}\n` +
        `Actividades: ${response.data.summary?.activitiesCount || 0}`
      );

      router.push('/maintenance/plans');
    } catch (err: any) {
      console.error('Error importing plan:', err);
      let errorMessage = 'Error al importar el plan';
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
        <h1 className="text-3xl font-bold text-gray-900">Importar Plan de Mantenimiento</h1>
        <p className="mt-2 text-gray-600">
          Importa un plan de mantenimiento desde un archivo Excel
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Tipo de Vehículo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Vehículo *
          </label>
          <select
            required
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar tipo de vehículo</option>
            <option value="TRUCK">Camión</option>
            <option value="TRAILER">Remolque</option>
            <option value="PICKUP">Pickup</option>
            <option value="VAN">Van</option>
          </select>
        </div>

        {/* Drag & Drop Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Archivo Excel *
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <div className="font-semibold text-gray-900">{file.name}</div>
                <div className="text-sm text-gray-600">
                  {(file.size / 1024).toFixed(2)} KB
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                >
                  Eliminar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-6xl">📥</div>
                <div className="font-semibold text-gray-900">
                  Arrastra y suelta el archivo aquí
                </div>
                <div className="text-sm text-gray-600">o haz clic para seleccionar</div>
                <div className="text-xs text-gray-500 mt-2">
                  Formatos soportados: .xlsx, .xls
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Formato Esperado del Excel:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Filas 8-9: Intervalos (horas y kilómetros)</li>
            <li>Columna A: Código de actividad (A.1, A.2, B.1, etc.)</li>
            <li>Columna B: Descripción de actividad</li>
            <li>Columnas C-L: Marcas (√, V, X) indicando aplicación en cada intervalo</li>
            <li>Categorías: Filas con solo código (A, B, C) sin punto</li>
          </ul>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Vista Previa:</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="font-medium">Nombre:</span> {preview.name}
              </div>
              <div>
                <span className="font-medium">Tamaño:</span>{' '}
                {(preview.size / 1024).toFixed(2)} KB
              </div>
            </div>
          </div>
        )}

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
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
            disabled={loading || !file || !vehicleType}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Importando...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Importar Plan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
