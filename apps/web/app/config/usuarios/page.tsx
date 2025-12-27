'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  roles: string[];
}

interface Role {
  id: string;
  code: string;
  name: string;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/admin/users?page=1&limit=100'),
        api.get('/admin/roles').catch(() => ({ data: [] })),
      ]);

      const usersData = usersRes.data?.data || usersRes.data || [];
      // Mostrar todos los usuarios sin filtrar por rol
      const usersList = Array.isArray(usersData) ? usersData : [];

      setUsers(usersList);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSave = async (userData: any) => {
    try {
      // Asegurar que tenemos roles disponibles
      if (!roles || roles.length === 0) {
        throw new Error('No se pudieron cargar los roles. Por favor, recarga la página.');
      }

      const payload: any = {
        email: userData.email.trim(),
        password: userData.password,
        firstName: userData.firstName?.trim() || '',
        lastName: userData.lastName?.trim() || '',
        roleIds: userData.roleIds && userData.roleIds.length > 0 
          ? userData.roleIds 
          : [],
      };

      // Agregar teléfono solo si tiene valor (no enviar si está vacío)
      if (userData.phone && userData.phone.trim() && userData.phone.trim() !== '') {
        payload.phone = userData.phone.trim();
      }

      if (selectedUser) {
        // Actualizar usuario existente
        const updatePayload: any = {
          firstName: payload.firstName,
          lastName: payload.lastName,
        };

        if (payload.phone !== undefined) {
          updatePayload.phone = payload.phone || null;
        }

        // Solo actualizar contraseña si se proporciona
        if (payload.password && payload.password.trim() !== '') {
          updatePayload.password = payload.password;
        }

        await api.patch(`/admin/users/${selectedUser.id}`, updatePayload);

        // Actualizar roles si es necesario
        if (payload.roleIds && payload.roleIds.length > 0) {
          await api.put(`/admin/users/${selectedUser.id}/roles`, {
            roleIds: payload.roleIds,
          });
        }

        setIsModalOpen(false);
        loadData();
        return;
      } else {
        // Validar que tenemos al menos un rol para nuevos usuarios
        if (!payload.roleIds || payload.roleIds.length === 0) {
          throw new Error('Debe asignar al menos un rol al usuario');
        }

        await api.post('/admin/users', payload);
        setIsModalOpen(false);
        loadData();
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      let errorMessage = 'Error al guardar el usuario';
      if (error.response?.data?.message) {
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Está seguro de eliminar este usuario? Esta acción marcará al usuario como inactivo.')) return;

    try {
      await api.delete(`/admin/users/${id}`);
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.message || 'Error al eliminar el usuario';
      alert(errorMessage);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm)),
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
        <p className="mt-2 text-gray-600">Gestiona los usuarios del sistema y sus roles</p>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleCreate}
          className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 transform"
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-500 text-lg">No hay usuarios registrados</p>
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* User Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.firstName?.[0]?.toUpperCase() || '?'}
                    {user.lastName?.[0]?.toUpperCase() || ''}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} title={user.isActive ? 'Activo' : 'Inactivo'}></div>
              </div>

              {/* User Info */}
              <div className="mb-4 space-y-2">
                {user.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <span>📞</span>
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <span>👤</span>
                  <span>{user.email}</span>
                </div>
              </div>

              {/* Roles */}
              {user.roles && user.roles.length > 0 ? (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600">
                    Sin roles asignados
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  onClick={() => handleEdit(user)}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={(e) => handleDelete(user.id, e)}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <UserModal
          user={selectedUser}
          roles={roles}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// User Modal Component
function UserModal({
  user,
  roles,
  onClose,
  onSave,
}: {
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSave: (user: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    roleIds: user?.roles?.map((r) => roles.find((role) => role.code === r)?.id).filter(Boolean) || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (!formData.email) {
      setError('El email es requerido');
      setLoading(false);
      return;
    }

    // Validar contraseña solo si es nuevo usuario o si se está cambiando
    if (!user && !formData.password) {
      setError('La contraseña es requerida para nuevos usuarios');
      setLoading(false);
      return;
    }

    if (formData.password && formData.password.length > 0) {
      if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
      }
    }

    if (!formData.firstName || !formData.lastName) {
      setError('El nombre y apellido son requeridos');
      setLoading(false);
      return;
    }

    // Validar que se asigne al menos un rol para nuevos usuarios
    if (!user && formData.roleIds.length === 0) {
      setError('Debe asignar al menos un rol al usuario');
      setLoading(false);
      return;
    }

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 animate-slide-in">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej: +593 99 999 9999"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {user ? '(dejar vacío para no cambiar)' : '*'}
                    </label>
                    <input
                      type="password"
                      required={!user}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={user ? 'Solo llenar si desea cambiar' : ''}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Contraseña {user ? '(si cambió la contraseña)' : '*'}
                    </label>
                    <input
                      type="password"
                  required={!user && formData.password.length > 0}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={user ? 'Solo si cambió la contraseña' : ''}
                    />
                  </div>
                </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roles {!user && '*'}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.roleIds.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            roleIds: [...formData.roleIds, role.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            roleIds: formData.roleIds.filter((id) => id !== role.id),
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{role.name} ({role.code})</span>
                  </label>
                ))}
              </div>
              {roles.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No hay roles disponibles.
                </p>
              )}
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

