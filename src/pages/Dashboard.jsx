import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Filter,
  MapPin,
  Truck,
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { LOCATIONS } from '../constants/locations';

export default function Dashboard() {
  const { isMock } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');

  // Load and subscribe to data
  useEffect(() => {
    if (isMock) {
      // Mock Storage Mode
      const loadMockData = () => {
        try {
          const storedVehicles = localStorage.getItem('mock_vehicles');
          const storedDrivers = localStorage.getItem('mock_drivers');
          const storedTrips = localStorage.getItem('mock_trips');
          const storedMaintenance = localStorage.getItem('mock_maintenance');

          if (storedVehicles) {
            setVehicles(JSON.parse(storedVehicles));
          }
          if (storedDrivers) {
            setDrivers(JSON.parse(storedDrivers));
          }
          if (storedTrips) {
            setTrips(JSON.parse(storedTrips));
          }
          if (storedMaintenance) {
            setMaintenance(JSON.parse(storedMaintenance));
          }

          setLoading(false);
        } catch (err) {
          console.error("Error loading mock data:", err);
          setError("Failed to load local mock datasets.");
          setLoading(false);
        }
      };

      loadMockData();

      const handleStorageUpdate = () => {
        loadMockData();
      };

      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('mock-vehicles-updated', handleStorageUpdate);
      window.addEventListener('mock-drivers-updated', handleStorageUpdate);
      window.addEventListener('mock-trips-updated', handleStorageUpdate);
      window.addEventListener('mock-maintenance-updated', handleStorageUpdate);

      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('mock-vehicles-updated', handleStorageUpdate);
        window.removeEventListener('mock-drivers-updated', handleStorageUpdate);
        window.removeEventListener('mock-trips-updated', handleStorageUpdate);
        window.removeEventListener('mock-maintenance-updated', handleStorageUpdate);
      };
    } else {
      // Real Firebase Firestore Mode
      setLoading(true);

      const vehiclesCol = collection(db, 'vehicles');
      const driversCol = collection(db, 'drivers');
      const tripsCol = collection(db, 'trips');
      const maintCol = collection(db, 'maintenance');

      const unsubVehicles = onSnapshot(vehiclesCol, (snap) => {
        const list = [];
        snap.forEach((doc) => {
          list.push({ regNo: doc.id, ...doc.data() });
        });
        setVehicles(list);
      }, (err) => {
        console.error('Vehicles snapshot error:', err);
        setError('Error loading vehicles database.');
      });

      const unsubDrivers = onSnapshot(driversCol, (snap) => {
        const list = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setDrivers(list);
      }, (err) => {
        console.error('Drivers snapshot error:', err);
        setError('Error loading drivers database.');
      });

      const unsubTrips = onSnapshot(tripsCol, (snap) => {
        const list = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setTrips(list);
      }, (err) => {
        console.error('Trips snapshot error:', err);
        setError('Error loading trips database.');
      });

      const unsubMaint = onSnapshot(maintCol, (snap) => {
        const list = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setMaintenance(list);
      }, (err) => {
        console.error('Maintenance snapshot error:', err);
        setError('Error loading maintenance database.');
      });

      // Clear loading when the initial snapshot fires or handles error
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 600);

      return () => {
        clearTimeout(timeout);
        unsubVehicles();
        unsubDrivers();
        unsubTrips();
        unsubMaint();
      };
    }
  }, [isMock]);

  // Derived location functions
  const getVehicleLocation = (vehicleRegNo) => {
    const vehicleTrips = trips.filter(t => t.vehicleId === vehicleRegNo);
    if (vehicleTrips.length > 0) {
      // Sort by createdAt descending to get the latest
      const sorted = [...vehicleTrips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latest = sorted[0];
      if (latest.status === 'Dispatched') {
        return latest.source;
      }
      if (latest.status === 'Completed') {
        return latest.destination;
      }
      return latest.source;
    }

    // Deterministic fallback based on regNo
    let hash = 0;
    for (let i = 0; i < vehicleRegNo.length; i++) {
      hash = vehicleRegNo.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % LOCATIONS.length;
    return LOCATIONS[index];
  };

  const getDriverLocation = (driverId) => {
    const driverTrips = trips.filter(t => t.driverId === driverId);
    if (driverTrips.length > 0) {
      const sorted = [...driverTrips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latest = sorted[0];
      if (latest.status === 'Dispatched') {
        return latest.source;
      }
      if (latest.status === 'Completed') {
        return latest.destination;
      }
      return latest.source;
    }

    // Deterministic fallback based on driverId
    let hash = 0;
    const idStr = driverId || '';
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % LOCATIONS.length;
    return LOCATIONS[index];
  };

  // Filter application
  const filteredVehicles = vehicles.filter(v => {
    const matchesType = filterType === 'All' || v.type === filterType;
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    const matchesRegion = filterRegion === 'All' || getVehicleLocation(v.regNo) === filterRegion;
    return matchesType && matchesStatus && matchesRegion;
  });

  const filteredDrivers = drivers.filter(d => {
    const driverId = d.id || d.uid;
    const driverLoc = getDriverLocation(driverId);
    const matchesRegion = filterRegion === 'All' || driverLoc === filterRegion;
    if (!matchesRegion) return false;

    const activeTrip = trips.find(t => t.driverId === driverId && t.status === 'Dispatched');
    const activeVehicle = activeTrip ? vehicles.find(v => v.regNo === activeTrip.vehicleId) : null;

    let matchesType = true;
    if (filterType !== 'All') {
      if (activeVehicle) {
        matchesType = activeVehicle.type === filterType;
      } else {
        const categoryMap = { HMV: 'Truck', LMV: 'Van', MMV: 'Mini' };
        const mappedType = categoryMap[d.licenseCategory] || 'Van';
        matchesType = mappedType === filterType;
      }
    }
    if (!matchesType) return false;

    let matchesStatus = true;
    if (filterStatus !== 'All') {
      if (activeVehicle) {
        matchesStatus = activeVehicle.status === filterStatus;
      } else {
        if (filterStatus === 'Available') matchesStatus = d.status === 'Available';
        else if (filterStatus === 'On Trip') matchesStatus = d.status === 'On Trip';
        else if (filterStatus === 'In Shop') matchesStatus = d.status === 'Off Duty';
        else if (filterStatus === 'Retired') matchesStatus = d.status === 'Suspended';
        else matchesStatus = false;
      }
    }
    return matchesStatus;
  });

  const filteredTrips = trips.filter(t => {
    const vehicle = vehicles.find(v => v.regNo === t.vehicleId);
    const matchesRegion = filterRegion === 'All' || t.source === filterRegion || t.destination === filterRegion;
    if (!matchesRegion) return false;

    const matchesType = filterType === 'All' || (vehicle && vehicle.type === filterType);
    if (!matchesType) return false;

    const matchesStatus = filterStatus === 'All' || (vehicle && vehicle.status === filterStatus);
    return matchesStatus;
  });

  // Calculate stats from filtered lists
  const activeVehiclesCount = filteredVehicles.filter(v => v.status !== 'Retired').length;
  const availableVehiclesCount = filteredVehicles.filter(v => v.status === 'Available').length;
  const vehiclesInMaintenanceCount = filteredVehicles.filter(v => v.status === 'In Shop').length;
  const activeTripsCount = filteredTrips.filter(t => t.status === 'Dispatched').length;
  const pendingTripsCount = filteredTrips.filter(t => t.status === 'Draft').length;

  // Drivers On Duty = count where status is 'On Trip' or 'Available'
  const driversOnDutyCount = filteredDrivers.filter(d => d.status === 'On Trip' || d.status === 'Available').length;

  // Fleet Utilization % = (vehicles with status 'On Trip' / total non-Retired vehicles) * 100
  const totalNonRetiredVehicles = filteredVehicles.filter(v => v.status !== 'Retired').length;
  const vehiclesOnTripCount = filteredVehicles.filter(v => v.status === 'On Trip').length;
  const fleetUtilization = totalNonRetiredVehicles > 0
    ? Math.round((vehiclesOnTripCount / totalNonRetiredVehicles) * 100)
    : 0;

  // Recent Trips (last 5-6 trips, sorted by most recent)
  const recentTrips = [...filteredTrips]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  // Vehicle Status Breakdown
  const statusCounts = {
    Available: filteredVehicles.filter(v => v.status === 'Available').length,
    'On Trip': filteredVehicles.filter(v => v.status === 'On Trip').length,
    'In Shop': filteredVehicles.filter(v => v.status === 'In Shop').length,
    Retired: filteredVehicles.filter(v => v.status === 'Retired').length,
  };
  const totalFilteredVehicles = filteredVehicles.length;

  const vehicleStatusBreakdown = [
    { name: 'Available', color: 'bg-green-500', count: statusCounts.Available },
    { name: 'On Trip', color: 'bg-blue-500', count: statusCounts['On Trip'] },
    { name: 'In Shop', color: 'bg-amber-500', count: statusCounts['In Shop'] },
    { name: 'Retired', color: 'bg-slate-500', count: statusCounts.Retired },
  ];

  // Helper to render ETA column details nicely
  const renderETA = (trip, vehicle, driver) => {
    if (trip.status === 'Draft') {
      if (!trip.vehicleId && !trip.driverId) {
        return <span className="text-amber-600 font-semibold">Awaiting vehicle & driver</span>;
      }
      if (!trip.vehicleId) {
        return <span className="text-amber-600 font-semibold">Awaiting vehicle</span>;
      }
      if (!trip.driverId) {
        return <span className="text-amber-600 font-semibold">Awaiting driver</span>;
      }
      return <span className="text-gray-500 font-medium">Ready for dispatch</span>;
    }
    if (trip.status === 'Dispatched') {
      const etaHours = Math.round((trip.plannedDistance || 0) / 62);
      return <span className="text-blue-600 font-mono font-medium">~{etaHours} hrs remaining</span>;
    }
    if (trip.status === 'Completed') {
      return <span className="text-emerald-600 font-medium">Arrived</span>;
    }
    return <span className="text-gray-400 font-mono">—</span>;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-gray-500 font-mono">Synchronizing Fleet Operations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-red-800">Operational Sync Error</h3>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Block */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Operational Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Real-time status monitor and operations console.</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 font-semibold whitespace-nowrap pl-1">
          <Filter className="h-4.5 w-4.5 text-amber-500" />
          <span>Filters:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {/* Vehicle Type Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 font-mono tracking-wider pl-1">Vehicle Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2 px-3 text-sm text-gray-800 dark:text-slate-200 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all font-sans cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
              <option value="Mini">Mini</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 font-mono tracking-wider pl-1">Vehicle Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2 px-3 text-sm text-gray-800 dark:text-slate-200 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all font-sans cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          {/* Region Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 font-mono tracking-wider pl-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-500" /> Region / Hub
            </label>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2 px-3 text-sm text-gray-800 dark:text-slate-200 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all font-sans cursor-pointer"
            >
              <option value="All">All Regions</option>
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (7 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Active Vehicles', value: activeVehiclesCount, attention: false },
          { label: 'Available Vehicles', value: availableVehiclesCount, attention: false },
          { label: 'Vehicles in Shop', value: vehiclesInMaintenanceCount, attention: true },
          { label: 'Active Trips', value: activeTripsCount, attention: false },
          { label: 'Pending Trips', value: pendingTripsCount, attention: true },
          { label: 'Drivers On Duty', value: driversOnDutyCount, attention: false },
          { label: 'Fleet Utilization', value: `${fleetUtilization}%`, attention: false },
        ].map((card, idx) => (
          <div
            key={idx}
            className={`bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-all duration-200 flex flex-col justify-between ${card.attention ? 'border-t-4 border-t-amber-500' : ''}`}
          >
            <div className="text-3xl font-bold text-gray-900 dark:text-slate-100 font-mono tracking-tight">
              {card.value}
            </div>
            <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-2 leading-tight">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Lower Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Trips Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-500" />
              <span>Recent Trips</span>
            </h3>
            <span className="text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono">
              Live data
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentTrips.length === 0 ? (
              <div className="p-12 text-center text-gray-400 dark:text-slate-500 text-sm font-mono">
                No recent trips matching filters.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800">
                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Trip / Route</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Vehicle</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Driver</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">Status</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                  {recentTrips.map(trip => {
                     const vehicle = vehicles.find(v => v.regNo === trip.vehicleId);
                     const driver = drivers.find(d => (d.id || d.uid) === trip.driverId);

                     let statusColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-gray-200 dark:border-slate-700';
                     if (trip.status === 'Dispatched') statusColor = 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200/30';
                     if (trip.status === 'Completed') statusColor = 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-semibold border border-green-200/30';
                     if (trip.status === 'Cancelled') statusColor = 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-semibold border border-red-200/30';

                     return (
                      <tr key={trip.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-900 dark:text-slate-100 font-mono">{trip.id}</div>
                          <div className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{trip.source}</span>
                            <span className="text-gray-400">→</span>
                            <span>{trip.destination}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {vehicle ? (
                            <div>
                              <div className="font-medium text-gray-800 dark:text-slate-200">{vehicle.name}</div>
                              <div className="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-0.5">{vehicle.regNo}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 font-mono">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {driver ? (
                            <div>
                              <div className="font-medium text-gray-800 dark:text-slate-200">{driver.name}</div>
                              <div className="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-0.5">{driver.licenseCategory}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 font-mono">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide ${statusColor}`}>
                            {trip.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-800 dark:text-slate-200">
                          {renderETA(trip, vehicle, driver)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Vehicle Status horizontal bar breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-1">
              <Truck className="h-5 w-5 text-amber-500" />
              <span>Vehicle Status Breakdown</span>
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">Proportional status of current filtered fleet.</p>
          </div>

          <div className="space-y-4 my-6">
            {vehicleStatusBreakdown.map(st => {
              const pct = totalFilteredVehicles > 0 ? Math.round((st.count / totalFilteredVehicles) * 100) : 0;
              return (
                <div key={st.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-700 dark:text-slate-300">{st.name}</span>
                    <span className="font-mono text-gray-500 dark:text-slate-400 font-semibold">{st.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full ${st.color} rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>Total Active Fleet:</span>
            <span className="font-bold text-gray-700 dark:text-slate-300">{totalFilteredVehicles} vehicles</span>
          </div>
        </div>
      </div>
    </div>
  );
}
