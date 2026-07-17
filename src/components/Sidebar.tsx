import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  FileSignature,
  UserCog,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
}

export default function Sidebar({ currentPath }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'clients', name: 'Clients', icon: Users, path: '/clients' },
    { id: 'projects', name: 'Projects', icon: Briefcase, path: '/projects' },
    { id: 'invoices', name: 'Invoices', icon: FileText, path: '/invoices' },
    { id: 'quotations', name: 'Quotations', icon: FileSignature, path: '/quotations' },
    { id: 'team', name: 'Team', icon: UserCog, path: '/team' },
    { id: 'settings', name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-sm tracking-wider">
            BN
          </div>
          <span className="font-semibold text-lg tracking-tight">
            IntelHub <span className="text-blue-400 font-light">ERP</span>
          </span>
        </div>
        <button
          id="mobile-menu-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="hidden md:flex items-center space-x-3 px-6 py-6 border-b border-slate-800 bg-slate-950">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-500/20">
            BN
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white tracking-tight text-base leading-none">BN IntelHub</span>
            <span className="text-xs text-blue-400 tracking-widest font-semibold mt-1">COMPANY ERP</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.id;
            return (
              <button
                id={`sidebar-link-${item.id}`}
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium tracking-wide transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors duration-150 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  }`}
                />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer with logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
          <button
            id="sidebar-logout"
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
          <div className="text-center">
            <div className="text-xs text-slate-500 tracking-wide">Version 2.0.0</div>
            <div className="text-[10px] text-slate-600 mt-1">Powered by Supabase & Node</div>
          </div>
        </div>
      </aside>
    </>
  );
}
