import React from 'react';

export default function Drivers() {
  const mockDrivers = [
    { id: 1, name: 'Marcus Vance', license: 'DL-99218-A', category: 'Class A CDL', expiry: '2028-11-14', contact: '+1 (555) 123-4567', safety: 98, status: 'Available' },
    { id: 2, name: 'Sarah Jenkins', license: 'DL-88214-B', category: 'Class B CDL', expiry: '2027-04-20', contact: '+1 (555) 987-6543', safety: 94, status: 'On Trip' },
    { id: 3, name: 'Robert Chen', license: 'DL-44109-A', category: 'Class A CDL', expiry: '2026-09-05', contact: '+1 (555) 456-7890', safety: 89, status: 'Off Duty' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Driver Registry</h2>
        <p className="text-sm text-gray-500 mt-1">Manage safety compliance, license updates, and dispatch statuses.</p>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">License Info</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Safety Score</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {mockDrivers.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">{d.name}</td>
                <td className="px-6 py-4 font-mono text-gray-600">
                  <span className="font-semibold block">{d.license}</span>
                  <span className="text-xs text-gray-400">{d.category} (Exp: {d.expiry})</span>
                </td>
                <td className="px-6 py-4 font-mono text-gray-600">{d.contact}</td>
                <td className="px-6 py-4 font-mono">
                  <span className={`inline-flex rounded-lg px-2 py-1 font-bold ${
                    d.safety >= 95 ? 'bg-green-50 text-green-700' :
                    d.safety >= 90 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {d.safety} / 100
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    d.status === 'Available' ? 'bg-green-100 text-green-800' :
                    d.status === 'On Trip' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {d.status}
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
