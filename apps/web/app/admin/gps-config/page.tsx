'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface GpsConfig {
  id?: string;
  email: string;
  syncIntervalMinutes: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
}

export default function GpsConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState<GpsConfig>({
    email: '',
    syncIntervalMinutes: 5,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadConfig();
  }, [router]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/gps/config');
      if (response.data) {
        setConfig(response.data);
      }
    } catch (error: any) {
      console.error('Error loading GPS config:', error);
      // No es error si no existe configuración
      if (error.response?.status !== 404) {
        setError('Error al cargar la configuración');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/gps/config', {
        email: config.email,
        password: (document.getElementById('password') as HTMLInputElement)?.value || undefined,
        syncIntervalMinutes: config.syncIntervalMinutes,
      });
      setSuccess('Configuración guardada correctamente');
      await loadConfig();
    } catch (error: any) {
      console.error('Error saving GPS config:', error);
      setError(error.response?.data?.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/gps/sync');
      setSuccess(`Sincronización completada. ${response.data.synced} vehículos sincronizados, ${response.data.errors} errores.`);
      await loadConfig();
    } catch (error: any) {
      console.error('Error syncing GPS:', error);
      setError(error.response?.data?.message || 'Error al sincronizar datos GPS');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configuración GPS</h1>
        <p className="mt-2 text-gray-600">Configuración de credenciales y sincronización para Radial Tracking</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña {config.id ? '(dejar en blanco para mantener la actual)' : '*'}
            </label>
            <input
              id="password"
              type="password"
              required={!config.id}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intervalo de Sincronización (minutos) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={config.syncIntervalMinutes}
              onChange={(e) => setConfig({ ...config, syncIntervalMinutes: parseInt(e.target.value) || 5 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">Frecuencia con la que se sincronizan los datos GPS (por defecto: 5 minutos)</p>
          </div>

          {config.lastSyncAt && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Última Sincronización</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Fecha:</span>{' '}
                  <span className="text-gray-600">
                    {new Date(config.lastSyncAt).toLocaleString('es-ES')}
                  </span>
                </div>
                {config.lastSyncStatus && (
                  <div>
                    <span className="font-medium">Estado:</span>{' '}
                    <span
                      className={
                        config.lastSyncStatus === 'SUCCESS'
                          ? 'text-green-600'
                          : config.lastSyncStatus === 'ERROR'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }
                    >
                      {config.lastSyncStatus}
                    </span>
                  </div>
                )}
                {config.lastSyncError && (
                  <div>
                    <span className="font-medium text-red-600">Error:</span>{' '}
                    <span className="text-red-600">{config.lastSyncError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleSync}
              disabled={saving || syncing || !config.id}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </button>
            <button
              type="submit"
              disabled={saving || syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
