import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { REVENUE_PER_TRIP } from '../constants/finance';
import { 
  TrendingUp, 
  Gauge, 
  DollarSign, 
  Flame, 
  Download, 
  Info, 
  Loader2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';

// Default Fallback Mock Data
const defaultMockVehicles = [
  { regNo: 'NY-4921-TR', name: 'Titan Hauler 1', model: 'Volvo VNL 860', type: 'Truck', capacity: 36000, odometer: 142500, acqCost: 125000, status: 'On Trip' },
  { regNo: 'CA-8891-BX', name: 'Metro Cargo 3', model: 'Isuzu NPR-HD', type: 'Van', capacity: 6500, odometer: 89200, acqCost: 45000, status: 'Available' },
  { regNo: 'TX-5201-FB', name: 'Heavy Carrier 7', model: 'Peterbilt 579', type: 'Truck', capacity: 40000, odometer: 210400, acqCost: 140000, status: 'In Shop' }
];

const defaultMockTrips = [
  { id: 'TR-1001', source: 'New York Hub', destination: 'Boston Warehouse A', vehicleId: 'NY-4921-TR', driverId: 'mock-driver-2', cargoWeight: 18500, plannedDistance: 346, status: 'Dispatched', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'TR-1002', source: 'Chicago Yard 3', destination: 'Detroit Terminal', vehicleId: 'CA-8891-BX', driverId: 'mock-driver-1', cargoWeight: 4200, plannedDistance: 450, status: 'Completed', createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), finalOdometer: 89650, fuelConsumed: 125 }
];

const defaultMockMaintenance = [
  { id: 'M-501', vehicleId: 'TX-5201-FB', serviceType: 'Transmission Repair', cost: 1250, date: '2026-07-10', status: 'In Progress' },
  { id: 'M-502', vehicleId: 'CA-8891-BX', serviceType: 'Oil Change', cost: 180, date: '2026-07-08', status: 'Completed' }
];

const defaultMockFuelLogs = [
  { id: 'FL-001', vehicleId: 'CA-8891-BX', liters: 125, cost: 181.25, date: '2026-07-08' },
  { id: 'FL-002', vehicleId: 'NY-4921-TR', liters: 340, cost: 493.00, date: '2026-07-10' }
];

export default function Analytics() {
  const { isMock } = useAuth();

  // Collections state
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Data synchronization
  useEffect(() => {
    if (isMock) {
      // Mock Storage Mode sync
      const loadMockData = () => {
        try {
          // Vehicles
          const storedVehicles = localStorage.getItem('mock_vehicles');
          if (storedVehicles) {
            setVehicles(JSON.parse(storedVehicles));
          } else {
            localStorage.setItem('mock_vehicles', JSON.stringify(defaultMockVehicles));
            setVehicles(defaultMockVehicles);
          }

          // Drivers data is unused on this screen

          // Trips
          const storedTrips = localStorage.getItem('mock_trips');
          if (storedTrips) {
            setTrips(JSON.parse(storedTrips));
          } else {
            localStorage.setItem('mock_trips', JSON.stringify(defaultMockTrips));
            setTrips(defaultMockTrips);
          }

          // Maintenance
          const storedMaintenance = localStorage.getItem('mock_maintenance');
          if (storedMaintenance) {
            setMaintenance(JSON.parse(storedMaintenance));
          } else {
            localStorage.setItem('mock_maintenance', JSON.stringify(defaultMockMaintenance));
            setMaintenance(defaultMockMaintenance);
          }

          // Fuel logs
          const storedFuelLogs = localStorage.getItem('mock_fuel_logs');
          if (storedFuelLogs) {
            setFuelLogs(JSON.parse(storedFuelLogs));
          } else {
            localStorage.setItem('mock_fuel_logs', JSON.stringify(defaultMockFuelLogs));
            setFuelLogs(defaultMockFuelLogs);
          }

          setLoading(false);
        } catch {
          setError('Failed to load mock databases.');
          setLoading(false);
        }
      };

      loadMockData();

      // Broad storage listeners to refresh analytics live when data changes anywhere
      const handleStorageUpdate = () => {
        loadMockData();
      };

      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('mock-vehicles-updated', handleStorageUpdate);
      window.addEventListener('mock-drivers-updated', handleStorageUpdate);
      window.addEventListener('mock-trips-updated', handleStorageUpdate);
      window.addEventListener('mock-maintenance-updated', handleStorageUpdate);
      window.addEventListener('mock-fuel-updated', handleStorageUpdate);

      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('mock-vehicles-updated', handleStorageUpdate);
        window.removeEventListener('mock-drivers-updated', handleStorageUpdate);
        window.removeEventListener('mock-trips-updated', handleStorageUpdate);
        window.removeEventListener('mock-maintenance-updated', handleStorageUpdate);
        window.removeEventListener('mock-fuel-updated', handleStorageUpdate);
      };
    } else {
      // Real Firebase Firestore Mode with onSnapshot subscriptions
      setLoading(true);

      const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ regNo: doc.id, ...doc.data() }));
        setVehicles(list);
      }, () => setError('Error loading vehicles collection.'));

      const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setTrips(list);
      }, () => setError('Error loading trips collection.'));

      const unsubMaintenance = onSnapshot(collection(db, 'maintenance'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setMaintenance(list);
      }, () => setError('Error loading maintenance collection.'));

      const unsubFuelLogs = onSnapshot(collection(db, 'fuelLogs'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setFuelLogs(list);
      }, () => setError('Error loading fuel logs collection.'));

      setLoading(false);

      return () => {
        unsubVehicles();
        unsubTrips();
        unsubMaintenance();
        unsubFuelLogs();
      };
    }
  }, [isMock]);

  // --- CALCULATIONS ---

  // 1. Fuel Efficiency (km/l)
  const completedTrips = trips.filter(t => t.status === 'Completed');
  const totalPlannedDistance = completedTrips.reduce((acc, t) => acc + (t.plannedDistance || 0), 0);
  const totalLitersLogged = fuelLogs.reduce((acc, f) => acc + (f.liters || 0), 0);
  const fuelEfficiency = totalLitersLogged > 0 ? (totalPlannedDistance / totalLitersLogged) : 0;

  // 2. Fleet Utilization (%)
  const nonRetiredVehicles = vehicles.filter(v => v.status !== 'Retired');
  const onTripVehicles = nonRetiredVehicles.filter(v => v.status === 'On Trip');
  const fleetUtilization = nonRetiredVehicles.length > 0 
    ? (onTripVehicles.length / nonRetiredVehicles.length) * 100 
    : 0;

  // 3. Operational Cost ($)
  const totalFuelCost = fuelLogs.reduce((acc, f) => acc + (f.cost || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((acc, m) => acc + (m.cost || 0), 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  // 4. Average Vehicle ROI (%)
  // For each vehicle with at least one completed trip: (Revenue - (Maintenance + Fuel)) / Acquisition Cost
  const vehiclesWithROI = vehicles.map(vehicle => {
    const vTrips = completedTrips.filter(t => t.vehicleId === vehicle.regNo);
    if (vTrips.length === 0) return null; // Only evaluate vehicles with at least one completed trip

    const revenue = vTrips.length * REVENUE_PER_TRIP;
    const vMaintenanceCost = maintenance.filter(m => m.vehicleId === vehicle.regNo).reduce((acc, m) => acc + (m.cost || 0), 0);
    const vFuelCost = fuelLogs.filter(f => f.vehicleId === vehicle.regNo).reduce((acc, f) => acc + (f.cost || 0), 0);
    
    const acqCostVal = vehicle.acqCost || 1; // avoid division by zero
    const roi = ((revenue - (vMaintenanceCost + vFuelCost)) / acqCostVal) * 100;
    return roi;
  }).filter(r => r !== null);

  const averageROI = vehiclesWithROI.length > 0 
    ? vehiclesWithROI.reduce((acc, r) => acc + r, 0) / vehiclesWithROI.length
    : 0;

  // --- CHART DATA PREPARATION ---

  // A. Monthly Revenue Chart (Bar)
  const getMonthlyRevenueData = () => {
    const monthlyMap = {};
    
    completedTrips.forEach(trip => {
      const dateVal = trip.createdAt || trip.date;
      if (!dateVal) return;
      
      const dateObj = new Date(dateVal);
      const year = dateObj.getFullYear();
      const month = dateObj.toLocaleString('default', { month: 'short' });
      const monthKey = `${month} ${year}`;
      const sortingValue = dateObj.getTime();

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, tripsCount: 0, sortKey: sortingValue };
      }
      monthlyMap[monthKey].tripsCount += 1;
    });

    const dataList = Object.values(monthlyMap);
    // Sort chronologically
    dataList.sort((a, b) => a.sortKey - b.sortKey);

    return dataList.map(item => ({
      name: item.month,
      Revenue: item.tripsCount * REVENUE_PER_TRIP
    }));
  };

  const monthlyRevenueData = getMonthlyRevenueData();

  // B. Top Costliest Vehicles Chart (ranks by maintenance + fuel cost)
  const getTopCostliestVehicles = () => {
    const list = vehicles.map(vehicle => {
      const vMaintenance = maintenance.filter(m => m.vehicleId === vehicle.regNo).reduce((acc, m) => acc + (m.cost || 0), 0);
      const vFuel = fuelLogs.filter(f => f.vehicleId === vehicle.regNo).reduce((acc, f) => acc + (f.cost || 0), 0);
      const totalCost = vMaintenance + vFuel;

      return {
        regNo: vehicle.regNo,
        name: vehicle.name || vehicle.model || 'Unknown Vehicle',
        totalCost
      };
    });

    // Sort descending by cost
    list.sort((a, b) => b.totalCost - a.totalCost);
    return list.slice(0, 5); // top 5
  };

  const topCostliestVehicles = getTopCostliestVehicles();

  // --- EXPORT CSV ---
  const handleExportCSV = () => {
    const headers = ["Metric Type", "Calculation Details", "Value"];
    const rows = [
      ["Fuel Efficiency", "Total completed distance / Total liters logged", `${fuelEfficiency.toFixed(1)} km/l`],
      ["Fleet Utilization", "Vehicles On Trip / Total active vehicles", `${fleetUtilization.toFixed(1)}%`],
      ["Total Operational Cost", "Combined Maintenance cost + Fuel costs", `$${totalOperationalCost.toFixed(2)}`],
      ["Average Vehicle ROI", "(Revenue - Costs) / Acquisition Cost", `${averageROI.toFixed(1)}%`],
      [],
      ["Rank", "Vehicle Registration No", "Model/Name", "Total Operational Cost ($)"]
    ];

    topCostliestVehicles.forEach((vehicle, index) => {
      rows.push([index + 1, vehicle.regNo, vehicle.name, `$${vehicle.totalCost.toFixed(2)}`]);
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.map(h => `"${h}"`).join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TransitOps_Analytics_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- EXPORT PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39); // Gray-900
    doc.text('TransitOps — Fleet Analytics Report', 14, 22);

    // Generated Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // Gray-500
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated: ${currentDate}`, 14, 28);

    // Divider Line
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    // KPI Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Key Performance Indicators', 14, 42);

    // KPI Background Box
    doc.setFillColor(249, 250, 251); // Gray-50
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.setLineWidth(0.5);
    doc.rect(14, 46, 182, 36, 'FD'); // Fill and border

    // Divider inside box
    doc.line(105, 50, 105, 78);

    // KPI Content
    doc.setFontSize(10);

    // Column 1
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.text('Fuel Efficiency:', 20, 56);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`${fuelEfficiency.toFixed(1)} km/l`, 60, 56);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text('Fleet Utilization:', 20, 68);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`${fleetUtilization.toFixed(1)}%`, 60, 68);

    // Column 2
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text('Operational Cost:', 110, 56);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`$${totalOperationalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 155, 56);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text('Avg Vehicle ROI:', 110, 68);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(`${averageROI.toFixed(1)}%`, 155, 68);

    // Table Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Top Costliest Vehicles', 14, 90);

    // Table using autoTable
    autoTable(doc, {
      startY: 94,
      head: [['Rank', 'Registration No', 'Model/Name', 'Total Operational Cost']],
      body: topCostliestVehicles.map((vehicle, index) => [
        index + 1,
        vehicle.regNo,
        vehicle.name,
        `$${vehicle.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105], // Slate-600 (slate header)
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Slate-50 / Gray-50 alternating row shading
      },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 60 },
        3: { cellWidth: 62, halign: 'right' }
      }
    });

    // Save/Download PDF
    doc.save('transitops-report.pdf');
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-250 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Review operational performance charts and ROI diagnostics.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-gray-900 shadow-sm transition-all cursor-pointer font-sans"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-gray-900 shadow-sm transition-all cursor-pointer font-sans"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Connection Issue Warning */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">System Sync Issue</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
          <p className="text-sm font-semibold tracking-wider text-gray-400 font-mono uppercase">Analyzing Fleet Diagnostics...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* KPI grid panels */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            
            {/* 1. Fuel Efficiency */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-amber-400 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Fuel Efficiency</span>
                <Flame className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 font-mono mt-3 tracking-tight">
                {fuelEfficiency.toFixed(1)} <span className="text-xs text-gray-500 font-sans">km/l</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-sans font-medium">Completed trips distance vs fuel liters</p>
            </div>

            {/* 2. Fleet Utilization */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-amber-400 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Fleet Utilization</span>
                <Gauge className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 font-mono mt-3 tracking-tight">
                {fleetUtilization.toFixed(1)}%
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-sans font-medium">On Trip vehicles / Non-Retired fleet</p>
            </div>

            {/* 3. Operational Cost */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-amber-400 transition-all duration-300">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Operational Cost</span>
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 font-mono mt-3 tracking-tight">
                ${totalOperationalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-sans font-medium">Total maintenance + fuel expenses</p>
            </div>

            {/* 4. Average Vehicle ROI */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-amber-400 transition-all duration-300 relative group">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Avg Vehicle ROI</span>
                <TrendingUp className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 font-mono mt-3 tracking-tight">
                {averageROI.toFixed(1)}%
              </div>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 cursor-help font-sans">
                <HelpCircle className="h-3 w-3 text-gray-400 shrink-0" />
                <span>Hover for ROI formula</span>
              </div>
              
              {/* Formula Tooltip Popup on Hover */}
              <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 bg-gray-900 text-white text-[10px] rounded-xl p-3 shadow-lg z-50 max-w-xs space-y-1 font-mono transition-opacity duration-200 border border-gray-700">
                <p className="font-bold text-amber-400 font-sans">ROI Equation:</p>
                <p>(Revenue - (Maintenance + Fuel)) / Acq. Cost</p>
                <p className="border-t border-gray-700 pt-1 mt-1 text-[9px] text-gray-400 font-sans">
                  *Revenue is modeled at ${REVENUE_PER_TRIP.toLocaleString()} per Completed trip. Only vehicles with Completed trips are included in this average.
                </p>
              </div>
            </div>

          </div>

          {/* Bottom row layouts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT — Monthly Revenue Chart (Bar) */}
            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 font-sans">Monthly Revenue Trend</h3>
                <span className="text-[9px] font-mono bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded uppercase font-bold">
                  revenue ledger
                </span>
              </div>

              {monthlyRevenueData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border border-dashed rounded-xl text-center">
                  <Info className="h-8 w-8 text-gray-300 mb-2 animate-pulse" />
                  <p className="text-xs text-gray-400 font-mono uppercase">Waiting for completed trips data...</p>
                </div>
              ) : (
                <div className="h-[300px] w-full font-mono text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#9CA3AF" tickLine={false} axisLine={false} />
                      <YAxis stroke="#9CA3AF" tickLine={false} axisLine={false} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                      <ChartTooltip 
                        formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                        contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                      />
                      <Bar dataKey="Revenue" radius={[8, 8, 0, 0]} maxBarSize={60}>
                        {monthlyRevenueData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#F59E0B" className="hover:opacity-90 transition-opacity" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* RIGHT — Top Costliest Vehicles list */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 font-sans">Top Costliest Vehicles</h3>
                <span className="text-[9px] font-mono bg-red-50 border border-red-200 text-red-800 px-2 py-0.5 rounded uppercase font-bold">
                  drain ranker
                </span>
              </div>

              {topCostliestVehicles.filter(v => v.totalCost > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border border-dashed rounded-xl text-center">
                  <Info className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400 font-mono uppercase">No maintenance or fuel logs found</p>
                </div>
              ) : (
                <div className="space-y-5 py-2">
                  {topCostliestVehicles.filter(v => v.totalCost > 0).map((vehicle, index) => {
                    // Determine Rank Colors: rank 1 = Red, rank 2 = Amber, rank 3 = Blue, rank 4/5 = Slate
                    const rankColors = [
                      { text: 'text-red-700 bg-red-50 border-red-200', bar: 'bg-red-500' },     // Rank 1
                      { text: 'text-amber-700 bg-amber-50 border-amber-200', bar: 'bg-amber-500' }, // Rank 2
                      { text: 'text-blue-700 bg-blue-50 border-blue-200', bar: 'bg-blue-500' },   // Rank 3
                      { text: 'text-gray-700 bg-gray-50 border-gray-200', bar: 'bg-gray-400' },   // Rank 4
                      { text: 'text-gray-700 bg-gray-50 border-gray-200', bar: 'bg-gray-400' }    // Rank 5
                    ];
                    const design = rankColors[index] || rankColors[4];
                    
                    // calculate relative percentage width for visual representation (relative to top costliest)
                    const maxCost = topCostliestVehicles[0].totalCost || 1;
                    const percentWidth = Math.max(12, (vehicle.totalCost / maxCost) * 100);

                    return (
                      <div key={vehicle.regNo} className="space-y-1.5 font-sans">
                        
                        {/* Title Row */}
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`h-5 w-5 rounded-md border flex items-center justify-center font-mono font-bold text-[10px] shadow-xs ${design.text}`}>
                              {index + 1}
                            </span>
                            <span className="font-bold text-gray-900 truncate max-w-[160px]">{vehicle.name}</span>
                            <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150">{vehicle.regNo}</span>
                          </div>
                          <span className="font-mono font-bold text-gray-800">
                            ${vehicle.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Bar Track & Progress Bar */}
                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-150">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${design.bar}`}
                            style={{ width: `${percentWidth}%` }}
                          ></div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
