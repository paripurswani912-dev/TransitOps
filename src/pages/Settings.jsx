import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { isMock, resetFailedAttempts } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">System Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure account options, view system logs, or reset demo parameters.</p>
      </div>

      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">Operational Demo Mode Controls</h3>
          <p className="text-sm text-gray-500 max-w-xl">
            TransitOps is currently running in <strong className="font-mono text-gray-800">[{isMock ? 'Mock Fallback Mode' : 'Production Firebase Mode'}]</strong>.
            You can manage active simulation states below.
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-800">Reset Security Lockouts</h4>
            <p className="text-xs text-gray-400 mt-1">Reset the failed login attempts tracker and unlock the sign-in forms.</p>
          </div>
          <button
            onClick={() => {
              resetFailedAttempts();
              alert("Security lockout counter and locks reset successfully!");
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-xl text-xs btn-magnetic transition-all"
          >
            Clear Failed Attempts Counter
          </button>
        </div>
      </div>
    </div>
  );
}
