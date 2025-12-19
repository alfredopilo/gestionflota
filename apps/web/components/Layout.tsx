'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Flota', path: '/vehicles', icon: '🚗' },
    { name: 'Rutas', path: '/routes', icon: '🗺️' },
    { name: 'Viajes', path: '/trips', icon: '🛣️' },
    { name: 'Choferes', path: '/drivers', icon: '👤' },
    { name: 'Mantenimientos', path: '/maintenance', icon: '🔧' },
    { name: 'Inspecciones', path: '/inspections', icon: '✓' },
    { name: 'Reportes', path: '/reports', icon: '📄' },
    { name: 'Administración', path: '/admin', icon: '⚙️' },
  ];

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-800 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between">
          <h1 className={`font-bold text-xl ${sidebarOpen ? 'block' : 'hidden'}`}>
            Control de Flotas
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1 p-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 transform hover:translate-x-1 ${
                    pathname === item.path
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="text-xl transition-transform duration-200 hover:scale-110">{item.icon}</span>
                  {sidebarOpen && <span className="font-medium">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          {sidebarOpen && user && (
            <div className="mb-2">
              <p className="text-sm text-gray-300">{user.email}</p>
              <p className="text-xs text-gray-400">
                {user.roles && user.roles.length > 0 ? user.roles[0] : 'Usuario'}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <span>🚪</span>
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800">
                {menuItems.find((item) => item.path === pathname)?.name || 'Sistema'}
              </h2>
              <div className="flex items-center space-x-4">
                {user && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      {user.roles && user.roles.length > 0 ? user.roles[0] : 'Usuario'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
