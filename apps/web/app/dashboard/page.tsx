'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface KPIs {
  fleetAvailability: number;
  maintenanceCompliance: number;
  tripsCompleted: number;
  totalKm: number;
  totalMaintenanceCost: number;
  operationalVehicles: number;
  maintenanceVehicles: number;
  totalVehicles: number;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadKPIs();
  }, [router]);

  const loadKPIs = async () => {
    try {
      const response = await api.get('/dashboard/kpis');
      setKpis(response.data);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Datos para gráfico de estado de flota
  const fleetStatusData: ChartData[] = kpis ? [
    { 
      name: 'Activos', 
      value: kpis.operationalVehicles, 
      color: '#10b981' 
    },
    { 
      name: 'En Mantenimiento', 
      value: kpis.maintenanceVehicles, 
      color: '#f59e0b' 
    },
    { 
      name: 'Inactivos', 
      value: kpis.totalVehicles - kpis.operationalVehicles - kpis.maintenanceVehicles, 
      color: '#ef4444' 
    },
  ] : [];

  // Datos para gráfico de barras (viajes por mes - datos de ejemplo)
  const tripsData = [
    { name: 'Ene', viajes: 45 },
    { name: 'Feb', viajes: 52 },
    { name: 'Mar', viajes: 48 },
    { name: 'Abr', viajes: 61 },
    { name: 'May', viajes: 55 },
    { name: 'Jun', viajes: kpis?.tripsCompleted || 0 },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const KPI_CARDS = kpis ? [
    {
      id: 'fleet',
      title: 'Vehículos Activos',
      value: `${kpis.operationalVehicles}`,
      subtitle: `de ${kpis.totalVehicles} en flota`,
      percentage: kpis.fleetAvailability.toFixed(1) + '%',
      trend: '↑',
      trendValue: '5%',
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      icon: '🚗',
      hoverColor: 'hover:shadow-xl hover:scale-105',
    },
    {
      id: 'maintenance',
      title: 'En Mantenimiento',
      value: `${kpis.maintenanceVehicles}`,
      subtitle: 'mantenimientos activos',
      percentage: null,
      trend: null,
      trendValue: null,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      icon: '🔧',
      hoverColor: 'hover:shadow-xl hover:scale-105',
    },
    {
      id: 'trips',
      title: 'Viajes Completados',
      value: `${kpis.tripsCompleted}`,
      subtitle: 'total de viajes',
      percentage: null,
      trend: '↑',
      trendValue: '12%',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      icon: '🛣️',
      hoverColor: 'hover:shadow-xl hover:scale-105',
    },
    {
      id: 'km',
      title: 'Kilómetros Recorridos',
      value: `${(kpis.totalKm / 1000).toFixed(0)}K`,
      subtitle: `${kpis.totalKm.toLocaleString('es-ES')} km total`,
      percentage: null,
      trend: null,
      trendValue: null,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      icon: '📊',
      hoverColor: 'hover:shadow-xl hover:scale-105',
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Resumen general del sistema</p>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {KPI_CARDS.map((card) => (
            <div
              key={card.id}
              className={`${card.color} ${card.hoverColor} rounded-xl p-6 text-white transition-all duration-300 cursor-pointer transform`}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => {
                if (card.id === 'fleet') router.push('/vehicles');
                if (card.id === 'maintenance') router.push('/maintenance');
                if (card.id === 'trips') router.push('/trips');
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium">{card.title}</p>
                  <p className="text-3xl font-bold mt-2">{card.value}</p>
                  <p className="text-white/70 text-sm mt-1">{card.subtitle}</p>
                  {card.percentage && (
                    <p className="text-lg font-semibold mt-2">{card.percentage}</p>
                  )}
                  {card.trend && (
                    <div className="flex items-center mt-2 text-sm">
                      <span className="text-green-200">{card.trend}</span>
                      <span className="ml-1">{card.trendValue}</span>
                    </div>
                  )}
                </div>
                <div className="text-4xl opacity-80">{card.icon}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      {kpis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estado de Flota - Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado de la Flota</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fleetStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {fleetStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{kpis.operationalVehicles}</p>
                <p className="text-sm text-gray-600">Activos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{kpis.maintenanceVehicles}</p>
                <p className="text-sm text-gray-600">Mantenimiento</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {kpis.totalVehicles - kpis.operationalVehicles - kpis.maintenanceVehicles}
                </p>
                <p className="text-sm text-gray-600">Inactivos</p>
              </div>
            </div>
          </div>

          {/* Viajes por Mes - Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Viajes por Mes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tripsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Legend />
                <Bar 
                  dataKey="viajes" 
                  fill="#3b82f6" 
                  radius={[8, 8, 0, 0]}
                  animationBegin={0}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cumplimiento de Mantenimiento */}
          <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Cumplimiento Mantenimiento</h3>
              <span className="text-2xl">✅</span>
            </div>
            <div className="relative pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {kpis.maintenanceCompliance.toFixed(1)}%
                </span>
              </div>
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-200">
                <div
                  style={{ width: `${kpis.maintenanceCompliance}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {kpis.operationalVehicles} mantenimientos completados a tiempo
              </p>
            </div>
          </div>

          {/* Costos de Mantenimiento */}
          <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Costos Mantenimiento</h3>
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                ${kpis.totalMaintenanceCost.toLocaleString('es-ES')}
              </p>
              <p className="text-sm text-gray-600 mt-2">Total acumulado</p>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-semibold">↓ 8%</span>
                <span className="ml-2 text-gray-600">vs mes anterior</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!kpis && !loading && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-gray-500">No hay datos disponibles</p>
        </div>
      )}
    </div>
  );
}
