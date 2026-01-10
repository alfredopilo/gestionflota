'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; message: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export default function ImportUsersPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
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
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setError('');
      setResult(null);
    } else {
      setError('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      setError('');
      
      const response = await api.get('/admin/users/template', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'usuarios_plantilla.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading template:', err);
      setError('Error al descargar la plantilla');
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Por favor, selecciona un archivo');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/admin/users/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      
      if (response.data.success && response.data.imported > 0) {
        // Limpiar el archivo después de una importación exitosa
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      console.error('Error importing users:', err);
      let errorMessage = 'Error al importar los usuarios';
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
          onClick={() => router.push('/config/usuarios')}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Volver a Usuarios
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Importar Usuarios</h1>
        <p className="mt-2 text-gray-600">
          Importa múltiples usuarios desde un archivo Excel
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Resultado de la importación */}
      {result && (
        <div className={`mb-6 p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h3 className={`font-semibold mb-2 ${result.success ? 'text-green-900' : 'text-yellow-900'}`}>
            Resultado de la Importación
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{result.summary.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">{result.summary.successful}</div>
              <div className="text-sm text-gray-600">Exitosos</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
              <div className="text-sm text-gray-600">Fallidos</div>
            </div>
          </div>
          
          {result.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Errores encontrados:</h4>
              <div className="max-h-48 overflow-y-auto bg-white rounded-lg p-3 text-sm">
                {result.errors.map((err, index) => (
                  <div key={index} className="text-red-700 mb-1">
                    <span className="font-medium">Fila {err.row}:</span> {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Botón de descarga de plantilla */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Paso 1: Descarga la plantilla</h3>
          <p className="text-gray-600 text-sm mb-3">
            Descarga la plantilla Excel y complétala con los datos de los usuarios a importar.
            La plantilla incluye una hoja con los roles disponibles.
          </p>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Descargando...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Descargar Plantilla</span>
              </>
            )}
          </button>
        </div>

        <hr />

        {/* Drag & Drop Area */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Paso 2: Sube el archivo completado</h3>
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
                    setResult(null);
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

        {/* Información de seguridad */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Nota de Seguridad</h4>
          <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
            <li>Las contraseñas deben tener al menos 6 caracteres</li>
            <li>Los usuarios recibirán acceso inmediato con las credenciales proporcionadas</li>
            <li>Asegúrate de que los roles asignados sean correctos</li>
          </ul>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push('/config/usuarios')}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Importando...</span>
              </>
            ) : (
              <>
                <span>📤</span>
                <span>Importar Usuarios</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
