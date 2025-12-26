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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Ajustar sidebar según tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    { name: 'Tipos de Gastos', path: '/expense-types', icon: '💰' },
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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Overlay para móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-800 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between">
          <h1 className={`font-bold text-xl ${sidebarOpen ? 'block' : 'hidden'}`}>
            Control de Flotas
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded hidden lg:block"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-gray-700 rounded lg:hidden"
            >
              ✕
            </button>
          </div>
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
              <p className="text-sm text-gray-300 truncate">{user.email}</p>
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
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Topbar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="text-2xl">☰</span>
                </button>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 truncate">
                  {menuItems.find((item) => item.path === pathname)?.name || 'Sistema'}
                </h2>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {user && (
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{user.email}</p>
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
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
