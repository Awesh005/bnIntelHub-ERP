import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../lib/AuthContext';
import { Bell, Clock, LogOut } from 'lucide-react';

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Derive current section from URL path
  const currentPath = location.pathname.split('/')[1] || 'dashboard';

  const handleLogout = async () => {
    await signOut();
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
  const userEmail = user?.email || '';

  return (
    <div
      id="erp-shell"
      className="min-h-screen bg-slate-50/50 flex flex-col md:flex-row font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white"
    >
      {/* Sidebar Navigation */}
      <Sidebar currentPath={currentPath} />

      {/* Main Working Panel */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        {/* Topbar */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-100 px-8 py-4.5 sticky top-0 z-30 shadow-sm shadow-slate-100/10">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
              Backoffice Portal
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs uppercase font-bold text-blue-600 tracking-wider capitalize">
              {currentPath}
            </span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-xs text-slate-400 font-medium flex items-center space-x-1.5 border-r border-slate-100 pr-6">
              <Clock size={13} />
              <span>Session: Active</span>
            </div>

            {/* User info + Logout */}
            <div className="flex items-center space-x-3">
              <div className="w-8.5 h-8.5 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow shadow-blue-500/10 border-2 border-white">
                {userInitial}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-none">{userEmail.split('@')[0]}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium leading-none">{userEmail}</p>
              </div>
            </div>

            <button
              id="topbar-logout"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 border border-slate-100 rounded-lg hover:bg-red-50 hover:border-red-100 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
