import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, AlertTriangle, HelpCircle } from 'lucide-react';

export default function Dashboard() {
  const { role } = useAuth();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Operational Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time status monitor and operations console.</p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[
          { name: 'Active Fleet', value: '42 / 48', desc: 'Vehicles dispatched today', status: 'normal' },
          { name: 'Dispatched Trips', value: '18', desc: 'In progress', status: 'normal' },
          { name: 'Pending Service', value: '3', desc: 'Requires immediate attention', status: 'warning' },
          { name: 'Fuel Burn Rate', value: '320L/hr', desc: 'Rolling avg last 6 hrs', status: 'normal' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-amber-400 transition-colors">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">{stat.name}</span>
            <div className="text-3xl font-bold text-gray-900 font-mono mt-2 tracking-tight">{stat.value}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              {stat.status === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
              <span>{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
          <HelpCircle className="h-4 w-4" /> Role Scope Notification
        </h3>
        <p className="text-xs text-amber-700 mt-2 leading-relaxed">
          You are currently logged in with the role: <strong className="font-mono text-amber-900 uppercase">[{role}]</strong>. 
          The sidebar links are dynamically enabled or locked based on your assigned Role-Based Access Control (RBAC) permissions. 
          Use the dropdown control on the Sign In page to quickly switch and test other operational workspaces.
        </p>
      </div>
    </div>
  );
}
