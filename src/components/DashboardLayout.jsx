import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Truck,
  Users,
  Send,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  LogOut,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';

import { RBAC_MATRIX } from '../constants/rbac';

// Friendly role names
const ROLE_NAMES = {
  FleetManager: 'Fleet Manager',
  Dispatcher: 'Dispatcher',
  SafetyOfficer: 'Safety Officer',
  FinancialAnalyst: 'Financial Analyst',
};

const getInitials = (name) => {
  if (!name) return 'RK';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const DashboardLayout = ({ children }) => {
  const { user, role, logOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logOut();
      navigate('/login');
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Fleet', path: '/fleet', icon: Truck },
    { name: 'Drivers', path: '/drivers', icon: Users },
    { name: 'Trips', path: '/dispatch', icon: Send },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Fuel & Expenses', path: '/fuel-expenses', icon: Fuel },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Check if current user role has access to current path
  // Dashboard is accessible to Dispatcher, but we can allow it as a fallback landing page for all,
  // or restrict it. Let's allow '/dashboard' as a common home page but display different widgets,
  // and check strict access for other pages.
  const hasAccess = (path) => {
    if (path === '/dashboard' || path === '/settings') return true;
    const permissions = RBAC_MATRIX[role] || {};
    return permissions[path] !== '—';
  };

  const isCurrentPathAllowed = hasAccess(location.pathname);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F3F4F6] dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 dark:border-slate-800 bg-[#1F2937] text-white">
        {/* Brand */}
        <div className="flex h-16 items-center px-6 border-b border-gray-800">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            TransitOps
          </span>
          <span className="ml-2 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500 font-mono">
            v1.0
          </span>
        </div>

        {/* User Info & Role Badge */}
        <div className="p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="text-sm font-medium truncate text-gray-200">{user?.name || user?.email}</div>
          <div className="text-[11px] font-semibold text-amber-400 font-mono uppercase mt-1 tracking-wider">
            {ROLE_NAMES[role] || role}
          </div>
          {user?.email && (
            <div className="text-[10px] text-gray-400 truncate mt-0.5">{user.email}</div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const allowed = hasAccess(item.path);
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={allowed ? item.path : '#'}
                onClick={(e) => {
                  if (!allowed) {
                    e.preventDefault();
                  }
                }}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-150 ${active
                    ? 'bg-amber-500 text-gray-900'
                    : allowed
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      : 'text-gray-600 cursor-not-allowed opacity-40'
                  }`}
                title={!allowed ? `Restricted to ${ROLE_NAMES[role]}` : ''}
              >
                <Icon className={`mr-3 h-5 w-5 shrink-0 ${active ? 'text-gray-900' : allowed ? 'text-gray-400 group-hover:text-white' : 'text-gray-700'
                  }`} />
                <span className="flex-1">{item.name}</span>
                {!allowed && (
                  <span className="text-[9px] font-mono bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                    Lock
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Log Out */}
        <div className="p-3 border-t border-gray-800">
          <button
            id="btn-sidebar-signout"
            onClick={handleSignOut}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors duration-150"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8 dark:bg-slate-900 dark:border-slate-800">
          <div></div>

          {/* User Profile Info (right) */}
          <div className="flex items-center space-x-3.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-all dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer flex items-center justify-center active:scale-95 duration-150"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-slate-500" />}
            </button>

            <div className="flex flex-col items-end text-right">
              <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>{user?.name || 'Raven K.'}</span>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 font-mono tracking-wider">
                  {role ? ROLE_NAMES[role] || role : 'Dispatcher'}
                </span>
              </div>
              {user?.email && (
                <div className="text-[10px] text-gray-400 dark:text-slate-400 font-mono">{user.email}</div>
              )}
            </div>

            {/* Avatar Circle */}
            <div className="h-9 w-9 rounded-full bg-amber-500 text-gray-950 flex items-center justify-center font-bold text-sm tracking-tighter">
              {getInitials(user?.name || user?.email || 'Raven K.')}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {isCurrentPathAllowed ? (
            <div className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 overflow-y-auto">
              {children}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-8 text-center">
              <div className="rounded-full bg-red-50 dark:bg-red-950/20 p-4 text-red-600 dark:text-red-400 mb-4">
                <ShieldAlert className="h-12 w-12" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Access Denied</h2>
              <p className="text-gray-500 dark:text-slate-400 max-w-md mb-6">
                Your role <strong className="text-gray-800 dark:text-slate-200 font-mono">[{role}]</strong> does not have permission to view the <strong className="text-gray-800 dark:text-slate-200">{navItems.find((n) => n.path === location.pathname)?.name}</strong> workspace.
              </p>
              <div className="text-xs text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-800 pt-4 w-full max-w-xs font-mono">
                RBAC Configuration Active
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
