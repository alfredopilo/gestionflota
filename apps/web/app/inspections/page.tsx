'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Inspection {
  id: string;
  inspectionNumber: string;
  vehicle: {
    id: string;
    plate: string;
  };
  template?: {
    id: string;
    name: string;
  };
  status: string;
  performedAt?: string;
  performedBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadInspections();
  }, [router, currentPage]);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/inspections?page=${currentPage}&limit=20`);
      setInspections(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && inspections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Cargando inspecciones...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Inspecciones</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push('/inspections/templates')}
            className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            📋 Templates
          </button>
          <button
            onClick={() => router.push('/inspections/new')}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + Nueva Inspección
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-lg overflow-hidden transition-shadow duration-300 hover:shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Realizada Por
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {inspections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No hay inspecciones registradas
                  </td>
                </tr>
              ) : (
                inspections.map((inspection, index) => (
                  <tr 
                    key={inspection.id} 
                    className="hover:bg-blue-50 transition-all duration-200 cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => router.push(`/inspections/${inspection.id}`)}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {inspection.inspectionNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {inspection.vehicle.plate}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {inspection.template?.name || 'Sin template'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                          inspection.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : inspection.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {inspection.status === 'PENDING'
                          ? 'Pendiente'
                          : inspection.status === 'IN_PROGRESS'
                          ? 'En Proceso'
                          : 'Completada'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {inspection.performedBy
                        ? `${inspection.performedBy.firstName} ${inspection.performedBy.lastName}`
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(inspection.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/inspections/${inspection.id}`);
                        }}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors duration-200"
                      >
                        Ver
                      </button>
                      {inspection.status !== 'COMPLETED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/inspections/${inspection.id}/execute`);
                          }}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-200"
                        >
                          Ejecutar
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
