import React from 'react';

export default function Maintenance() {
  const mockMaintenance = [
    { id: 'M-501', vehicleId: 'TX-5201-FB', serviceType: 'Transmission Repair', cost: 1250, date: '2026-07-10', status: 'In Shop' },
    { id: 'M-502', vehicleId: 'CA-8891-BX', serviceType: 'Oil Change & Filter Replacement', cost: 180, date: '2026-07-08', status: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Maintenance Logs</h2>
        <p className="text-sm text-gray-500 mt-1">Track vehicle repairs, service costs, and shop status.</p>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Service ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Vehicle ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Service Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm font-mono">
            {mockMaintenance.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">{m.id}</td>
                <td className="px-6 py-4 text-gray-700 font-semibold">{m.vehicleId}</td>
                <td className="px-6 py-4 font-sans text-gray-600">{m.serviceType}</td>
                <td className="px-6 py-4 text-gray-800 font-bold">${m.cost.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-500">{m.date}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium font-sans ${
                    m.status === 'In Shop' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {m.status}
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
