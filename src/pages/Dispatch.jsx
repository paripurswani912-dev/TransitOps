import React from 'react';

export default function Dispatch() {
  const mockTrips = [
    { id: 'T-1001', from: 'New York Hub', to: 'Boston Warehouse A', vehicle: 'NY-4921-TR', driver: 'Sarah Jenkins', cargo: '18,500 kg', distance: '215 mi', status: 'Dispatched' },
    { id: 'T-1002', from: 'Chicago Yard 3', to: 'Detroit Terminal', vehicle: 'CA-8891-BX', driver: 'Marcus Vance', cargo: '4,200 kg', distance: '280 mi', status: 'Draft' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dispatch Console</h2>
        <p className="text-sm text-gray-500 mt-1">Plan trips, allocate drivers/vehicles, and monitor progress.</p>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Trip ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Route</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Allocation</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Details</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {mockTrips.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-gray-900">{t.id}</td>
                <td className="px-6 py-4">
                  <span className="font-semibold block text-gray-800">{t.from}</span>
                  <span className="text-xs text-gray-400">→ {t.to}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="block text-gray-700">{t.driver}</span>
                  <span className="text-xs font-mono text-gray-400">{t.vehicle}</span>
                </td>
                <td className="px-6 py-4 font-mono text-gray-600">
                  <span className="block">{t.cargo}</span>
                  <span className="text-xs text-gray-400">{t.distance}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    t.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
