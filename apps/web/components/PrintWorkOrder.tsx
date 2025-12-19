'use client';

import React from 'react';

interface WorkOrderPrintProps {
  workOrder: any;
  onClose: () => void;
}

export default function PrintWorkOrder({ workOrder, onClose }: WorkOrderPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      IN_PROGRESS: 'En Proceso',
      COMPLETED: 'Completada',
      CANCELLED: 'Cancelada',
    };
    return labels[status] || status;
  };

  return (
    <>
      {/* Botones de acción (no se imprimen) */}
      <div className="print:hidden fixed top-4 right-4 z-50 space-x-2">
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow-lg"
        >
          ✕ Cerrar
        </button>
      </div>

      {/* Contenido imprimible */}
      <div className="bg-white p-8 max-w-5xl mx-auto print:p-0">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ORDEN DE TRABAJO</h1>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Número:</strong> {workOrder.number}
            </div>
            <div>
              <strong>Estado:</strong> {getStatusLabel(workOrder.status)}
            </div>
            <div>
              <strong>Tipo:</strong> {workOrder.type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo'}
            </div>
            <div>
              <strong>Fecha Creación:</strong> {new Date(workOrder.createdAt).toLocaleDateString('es-ES')}
            </div>
          </div>
        </div>

        {/* Información del Vehículo */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Información del Vehículo
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Placa:</strong> {workOrder.vehicle.plate}
            </div>
            <div>
              <strong>Marca/Modelo:</strong> {workOrder.vehicle.brand} {workOrder.vehicle.model}
            </div>
            {workOrder.odometerAtStart && (
              <div>
                <strong>Odómetro:</strong> {Number(workOrder.odometerAtStart).toLocaleString()} km
              </div>
            )}
            {workOrder.hourmeterAtStart && (
              <div>
                <strong>Horómetro:</strong> {Number(workOrder.hourmeterAtStart).toLocaleString()} h
              </div>
            )}
          </div>
        </div>

        {/* Personal */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Personal Asignado
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {workOrder.operator && (
              <div>
                <strong>Operador:</strong> {workOrder.operator.firstName} {workOrder.operator.lastName}
              </div>
            )}
            {workOrder.supervisor && (
              <div>
                <strong>Supervisor:</strong> {workOrder.supervisor.firstName} {workOrder.supervisor.lastName}
              </div>
            )}
          </div>
        </div>

        {/* Fechas */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Fechas
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {workOrder.scheduledDate && (
              <div>
                <strong>Programada:</strong><br />
                {new Date(workOrder.scheduledDate).toLocaleDateString('es-ES')}
              </div>
            )}
            {workOrder.startedAt && (
              <div>
                <strong>Iniciada:</strong><br />
                {new Date(workOrder.startedAt).toLocaleDateString('es-ES')} {new Date(workOrder.startedAt).toLocaleTimeString('es-ES')}
              </div>
            )}
            {workOrder.completedAt && (
              <div>
                <strong>Completada:</strong><br />
                {new Date(workOrder.completedAt).toLocaleDateString('es-ES')} {new Date(workOrder.completedAt).toLocaleTimeString('es-ES')}
              </div>
            )}
          </div>
        </div>

        {/* Actividades */}
        {workOrder.items && workOrder.items.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
              Actividades de Mantenimiento
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Código</th>
                  <th className="border border-gray-300 p-2 text-left">Descripción</th>
                  <th className="border border-gray-300 p-2 text-center">Estado</th>
                  <th className="border border-gray-300 p-2 text-right">Horas</th>
                  <th className="border border-gray-300 p-2 text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {workOrder.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2">
                      {item.activity?.code || '-'}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {item.activity?.description || '-'}
                      {item.observations && (
                        <div className="text-xs text-gray-600 mt-1">
                          Obs: {item.observations}
                        </div>
                      )}
                      {item.partsUsed && (
                        <div className="text-xs text-gray-600 mt-1">
                          Partes: {item.partsUsed}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      {getStatusLabel(item.status)}
                    </td>
                    <td className="border border-gray-300 p-2 text-right">
                      {item.laborHours ? `${item.laborHours}h` : '-'}
                    </td>
                    <td className="border border-gray-300 p-2 text-right">
                      {item.cost ? `$${Number(item.cost).toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {workOrder.totalCost && (
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={4} className="border border-gray-300 p-2 text-right">
                      TOTAL:
                    </td>
                    <td className="border border-gray-300 p-2 text-right">
                      ${Number(workOrder.totalCost).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Notas */}
        {workOrder.notes && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
              Observaciones
            </h2>
            <p className="text-sm whitespace-pre-wrap">{workOrder.notes}</p>
          </div>
        )}

        {/* Firmas */}
        {workOrder.signatures && workOrder.signatures.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
              Firmas
            </h2>
            <div className="grid grid-cols-2 gap-6">
              {workOrder.signatures.map((signature: any) => (
                <div key={signature.id} className="border border-gray-300 p-4">
                  <div className="text-sm">
                    <strong>Nombre:</strong> {signature.user.firstName} {signature.user.lastName}
                  </div>
                  <div className="text-sm">
                    <strong>Rol:</strong> {signature.signatureType}
                  </div>
                  <div className="text-sm">
                    <strong>Fecha:</strong> {new Date(signature.signedAt).toLocaleString('es-ES')}
                  </div>
                  <div className="mt-8 border-t border-gray-400 pt-2 text-center text-xs">
                    Firma
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-gray-800 text-xs text-gray-600 text-center">
          <p>Sistema de Gestión de Flotas - Orden impresa el {new Date().toLocaleString('es-ES')}</p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-0,
          .print\\:p-0 * {
            visibility: visible;
          }
          .print\\:p-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: letter;
            margin: 1cm;
          }
        }
      `}</style>
    </>
  );
}
