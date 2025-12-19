'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadVehicles();
  }, [router]);

  const loadVehicles = async () => {
    try {
      const response = await api.get('/vehicles?page=1&limit=100');
      setVehicles(response.data.data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const generateReport = async (type: string, format: 'pdf' | 'excel') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type,
        format,
      });

      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (vehicleId) params.append('vehicleId', vehicleId);

      const response = await api.post(`/reports/generate?${params.toString()}`, {}, {
        responseType: 'blob',
      });

      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte-${type}-${new Date().getTime()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="mt-2 text-gray-600">Genera reportes en formato PDF o Excel</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehículo (Opcional)
            </label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos los vehículos</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} - {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Reporte de Viajes */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Reporte de Viajes</h3>
            <p className="text-sm text-gray-600 mb-4">Listado detallado de viajes</p>
            <div className="flex space-x-2">
              <button
                onClick={() => generateReport('trips', 'pdf')}
                disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                PDF
              </button>
              <button
                onClick={() => generateReport('trips', 'excel')}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Excel
              </button>
            </div>
          </div>

          {/* Reporte de Mantenimientos */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Reporte de Mantenimientos</h3>
            <p className="text-sm text-gray-600 mb-4">Historial de mantenimientos</p>
            <div className="flex space-x-2">
              <button
                onClick={() => generateReport('maintenance', 'pdf')}
                disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                PDF
              </button>
              <button
                onClick={() => generateReport('maintenance', 'excel')}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Excel
              </button>
            </div>
          </div>

          {/* Reporte de Vehículos */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Reporte de Vehículos</h3>
            <p className="text-sm text-gray-600 mb-4">Listado completo de vehículos</p>
            <div className="flex space-x-2">
              <button
                onClick={() => generateReport('vehicles', 'pdf')}
                disabled={loading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                PDF
              </button>
              <button
                onClick={() => generateReport('vehicles', 'excel')}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
