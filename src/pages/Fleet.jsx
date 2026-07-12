import React from 'react';

export default function Fleet() {
  const mockVehicles = [
    { regNo: 'NY-4921-TR', name: 'Titan Hauler 1', model: 'Volvo VNL 860', type: 'Sleeper Cab', capacity: '36000', odometer: '142,500 km', status: 'On Trip' },
    { regNo: 'CA-8891-BX', name: 'Metro Cargo 3', model: 'Isuzu NPR-HD', type: 'Box Truck', capacity: '6500', odometer: '89,200 km', status: 'Available' },
    { regNo: 'TX-5201-FB', name: 'Heavy Carrier 7', model: 'Peterbilt 579', type: 'Flatbed', capacity: '40000', odometer: '210,400 km', status: 'In Shop' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Fleet Directory</h2>
        <p className="text-sm text-gray-500 mt-1">Manage active vehicles, capacities, and maintenance schedules.</p>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Reg No</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Specs</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Capacity</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Odometer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono text-sm">
            {mockVehicles.map((v) => (
              <tr key={v.regNo} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">{v.regNo}</td>
                <td className="px-6 py-4 font-sans text-gray-700">{v.name}</td>
                <td className="px-6 py-4 font-sans text-gray-500">{v.model} ({v.type})</td>
                <td className="px-6 py-4 text-gray-600">{v.capacity} kg</td>
                <td className="px-6 py-4 text-gray-600">{v.odometer}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium font-sans ${
                    v.status === 'Available' ? 'bg-green-100 text-green-800' :
                    v.status === 'On Trip' ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {v.status}
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
