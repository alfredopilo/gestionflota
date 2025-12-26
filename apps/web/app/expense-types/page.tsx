'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface ExpenseType {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function ExpenseTypesPage() {
  const router = useRouter();
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpenseType, setSelectedExpenseType] = useState<ExpenseType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadExpenseTypes();
  }, [router]);

  const loadExpenseTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/expense-types?page=1&limit=100');
      setExpenseTypes(response.data.data || []);
    } catch (error) {
      console.error('Error loading expense types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedExpenseType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (expenseType: ExpenseType) => {
    setSelectedExpenseType(expenseType);
    setIsModalOpen(true);
  };

  const handleSave = async (expenseType: ExpenseType) => {
    try {
      const payload: any = {
        name: expenseType.name.trim(),
        active: expenseType.active !== undefined ? expenseType.active : true,
      };

      if (expenseType.description) {
        payload.description = expenseType.description.trim();
      }

      if (expenseType.id) {
        await api.patch(`/expense-types/${expenseType.id}`, payload);
      } else {
        await api.post('/expense-types', payload);
      }
      setIsModalOpen(false);
      loadExpenseTypes();
    } catch (error: any) {
      console.error('Error saving expense type:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Está seguro de eliminar este tipo de gasto?')) return;

    try {
      await api.delete(`/expense-types/${id}`);
      loadExpenseTypes();
    } catch (error) {
      console.error('Error deleting expense type:', error);
      alert('Error al eliminar el tipo de gasto');
    }
  };

  const filteredExpenseTypes = expenseTypes.filter((et) => {
    const matchesSearch =
      et.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (et.description && et.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = activeFilter === 'ALL' || (activeFilter === 'ACTIVE' && et.active) || (activeFilter === 'INACTIVE' && !et.active);
    return matchesSearch && matchesFilter;
  });

  if (loading && expenseTypes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tipos de Gastos</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          Gestiona los tipos de gastos para los viajes (Pagos de peaje, comida, etc.)
        </p>
      </div>

      {/* Search and Actions */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
        >
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
        <button
          onClick={handleCreate}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 transform text-sm sm:text-base whitespace-nowrap"
        >
          + Nuevo Tipo
        </button>
      </div>

      {/* Expense Types Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredExpenseTypes.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-500 text-lg">
              {searchTerm || activeFilter !== 'ALL'
                ? 'No se encontraron tipos de gastos'
                : 'No hay tipos de gastos registrados'}
            </p>
          </div>
        ) : (
          filteredExpenseTypes.map((expenseType, index) => (
            <div
              key={expenseType.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Expense Type Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="font-bold text-lg text-gray-900">{expenseType.name}</div>
                  {expenseType.description && (
                    <div className="text-sm text-gray-600 mt-1">{expenseType.description}</div>
                  )}
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    expenseType.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {expenseType.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  onClick={() => handleEdit(expenseType)}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={(e) => handleDelete(expenseType.id, e)}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Expense Type Modal */}
      {isModalOpen && (
        <ExpenseTypeModal
          expenseType={selectedExpenseType}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// Expense Type Modal Component
function ExpenseTypeModal({
  expenseType,
  onClose,
  onSave,
}: {
  expenseType: ExpenseType | null;
  onClose: () => void;
  onSave: (expenseType: ExpenseType) => Promise<void>;
}) {
  const [formData, setFormData] = useState<ExpenseType>({
    id: expenseType?.id || '',
    name: expenseType?.name || '',
    description: expenseType?.description || '',
    active: expenseType?.active !== undefined ? expenseType.active : true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSave(formData);
    } catch (err: any) {
      let errorMessage = 'Error al guardar el tipo de gasto';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 animate-slide-in">
        <div className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">
            {expenseType ? 'Editar Tipo de Gasto' : 'Nuevo Tipo de Gasto'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Pagos de peaje"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional del tipo de gasto..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Activo</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Los tipos de gastos inactivos no estarán disponibles para nuevos gastos
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
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

