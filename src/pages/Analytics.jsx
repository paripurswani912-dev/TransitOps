import React from 'react';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">System Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">Review operational performance metrics and safety metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider font-mono mb-4">CO2 Fleet Output Trends</h3>
          <div className="h-48 bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
            <span className="text-sm text-gray-400 font-mono">Chart View Placeholder</span>
          </div>
        </div>
        <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider font-mono mb-4">Monthly Expenditure Analysis</h3>
          <div className="h-48 bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
            <span className="text-sm text-gray-400 font-mono">Chart View Placeholder</span>
          </div>
        </div>
      </div>
    </div>
  );
}
