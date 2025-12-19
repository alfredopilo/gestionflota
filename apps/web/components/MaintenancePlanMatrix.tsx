'use client';

import React, { useState, useMemo, useEffect } from 'react';

interface Interval {
  id: string;
  hours: number;
  kilometers: number;
  sequenceOrder: number;
}

interface Activity {
  id: string;
  code: string;
  description: string;
  category?: string;
  activityMatrix?: Array<{
    intervalId: string;
    applies: boolean;
  }>;
}

interface MaintenancePlanMatrixProps {
  intervals: Interval[];
  activities: Activity[];
  onMatrixChange?: (activityId: string, intervalId: string, applies: boolean) => void;
  editable?: boolean;
  searchTerm?: string;
  filterCategory?: string;
}

export default function MaintenancePlanMatrix({
  intervals,
  activities,
  onMatrixChange,
  editable = false,
  searchTerm = '',
  filterCategory = '',
}: MaintenancePlanMatrixProps) {
  const [localMatrix, setLocalMatrix] = useState<Record<string, Record<string, boolean>>>({});

  // Inicializar matriz local desde activityMatrix
  useEffect(() => {
    const matrix: Record<string, Record<string, boolean>> = {};
    activities.forEach((activity) => {
      matrix[activity.id] = {};
      intervals.forEach((interval) => {
        const matrixEntry = activity.activityMatrix?.find((m) => m.intervalId === interval.id);
        matrix[activity.id][interval.id] = matrixEntry?.applies || false;
      });
    });
    setLocalMatrix(matrix);
  }, [activities, intervals]);

  // Filtrar actividades
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    if (filterCategory) {
      filtered = filtered.filter((a) => a.category === filterCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.code.toLowerCase().includes(term) ||
          a.description.toLowerCase().includes(term) ||
          a.category?.toLowerCase().includes(term),
      );
    }

    // Agrupar por categoría
    const grouped = filtered.reduce((acc, activity) => {
      const category = activity.category || 'Sin categoría';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(activity);
      return acc;
    }, {} as Record<string, Activity[]>);

    return grouped;
  }, [activities, searchTerm, filterCategory]);

  const handleCheckboxChange = (activityId: string, intervalId: string, checked: boolean) => {
    if (!editable) return;

    setLocalMatrix((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [intervalId]: checked,
      },
    }));

    if (onMatrixChange) {
      onMatrixChange(activityId, intervalId, checked);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      A: 'bg-blue-50 border-blue-200',
      B: 'bg-green-50 border-green-200',
      C: 'bg-yellow-50 border-yellow-200',
      D: 'bg-purple-50 border-purple-200',
      E: 'bg-pink-50 border-pink-200',
    };
    return colors[category] || 'bg-gray-50 border-gray-200';
  };

  if (intervals.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center text-gray-500">
        No hay intervalos configurados. Agrega intervalos para ver la matriz.
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center text-gray-500">
        No hay actividades configuradas. Agrega actividades para ver la matriz.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 border-r border-gray-200 min-w-[200px]">
                Actividad
              </th>
              {intervals.map((interval) => (
                <th
                  key={interval.id}
                  className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-700 min-w-[120px]"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="font-semibold">I{interval.sequenceOrder}</span>
                    <div className="text-xs text-gray-600">
                      <div>{Number(interval.hours).toLocaleString('es-ES')}h</div>
                      <div>{Number(interval.kilometers).toLocaleString('es-ES')}km</div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(filteredActivities).map(([category, categoryActivities]) => (
              <React.Fragment key={category}>
                {/* Fila de categoría */}
                <tr className={`${getCategoryColor(category)} font-semibold`}>
                  <td
                    colSpan={intervals.length + 1}
                    className="px-4 py-2 text-sm text-gray-900 sticky left-0"
                  >
                    Categoría {category}
                  </td>
                </tr>
                {/* Actividades de la categoría */}
                {categoryActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm border-r border-gray-200">
                      <div className="font-medium text-gray-900">{activity.code}</div>
                      <div className="text-xs text-gray-600 mt-1">{activity.description}</div>
                    </td>
                    {intervals.map((interval) => {
                      const isChecked =
                        localMatrix[activity.id]?.[interval.id] ||
                        activity.activityMatrix?.find((m) => m.intervalId === interval.id)?.applies ||
                        false;

                      return (
                        <td key={interval.id} className="px-4 py-3 text-center">
                          {editable ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                handleCheckboxChange(activity.id, interval.id, e.target.checked)
                              }
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          ) : (
                            <div className="flex justify-center">
                              {isChecked ? (
                                <span className="text-green-600 text-xl">✓</span>
                              ) : (
                                <span className="text-gray-300 text-xl">○</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
