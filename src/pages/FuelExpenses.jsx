import React from 'react';

export default function FuelExpenses() {
  const mockLogs = [
    { id: 1, vehicleId: 'NY-4921-TR', liters: 120, cost: 186.50, date: '2026-07-11' },
    { id: 2, vehicleId: 'CA-8891-BX', liters: 45, cost: 72.90, date: '2026-07-10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Fuel & Expenses</h2>
        <p className="text-sm text-gray-500 mt-1">Audit fuel logs, tolls, and other operational expenses.</p>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Log ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Vehicle ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Liters Refueled</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Total Cost</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm font-mono text-gray-600">
            {mockLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">{log.id}</td>
                <td className="px-6 py-4 text-gray-700 font-semibold">{log.vehicleId}</td>
                <td className="px-6 py-4">{log.liters} L</td>
                <td className="px-6 py-4 text-gray-900 font-bold">${log.cost.toFixed(2)}</td>
                <td className="px-6 py-4 text-gray-500">{log.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
