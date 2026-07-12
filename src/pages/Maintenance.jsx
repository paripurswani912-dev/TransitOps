import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  Wrench, 
  Search, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  Info, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

// Default Mock Data for Maintenance Logs
const defaultMockMaintenance = [
  { id: 'M-501', vehicleId: 'TX-5201-FB', serviceType: 'Transmission Repair', cost: 1250, date: '2026-07-10', status: 'In Progress' },
  { id: 'M-502', vehicleId: 'CA-8891-BX', serviceType: 'Oil Change', cost: 180, date: '2026-07-08', status: 'Completed' }
];

// Fallback Mock Vehicles
const defaultMockVehicles = [
  { regNo: 'NY-4921-TR', name: 'Titan Hauler 1', model: 'Volvo VNL 860', type: 'Truck', capacity: 36000, odometer: 142500, acqCost: 125000, status: 'On Trip' },
  { regNo: 'CA-8891-BX', name: 'Metro Cargo 3', model: 'Isuzu NPR-HD', type: 'Van', capacity: 6500, odometer: 89200, acqCost: 45000, status: 'Available' },
  { regNo: 'TX-5201-FB', name: 'Heavy Carrier 7', model: 'Peterbilt 579', type: 'Truck', capacity: 40000, odometer: 210400, acqCost: 140000, status: 'In Shop' }
];

export default function Maintenance() {
  const { isMock } = useAuth();
  
  // Collections state
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Fields state
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [serviceType, setServiceType] = useState('Oil Change');
  const [customServiceType, setCustomServiceType] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // defaults to YYYY-MM-DD
  const [status, setStatus] = useState('In Progress');

  // Filter & validation states
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [updatingLogId, setUpdatingLogId] = useState(null);

  // Ref for button magnetic hover
  const btnRef = useRef(null);

  // 1. Data synchronization
  useEffect(() => {
    if (isMock) {
      // Mock Storage Mode
      const loadMockData = () => {
        try {
          // Maintenance logs
          const storedLogs = localStorage.getItem('mock_maintenance');
          if (storedLogs) {
            setLogs(JSON.parse(storedLogs));
          } else {
            localStorage.setItem('mock_maintenance', JSON.stringify(defaultMockMaintenance));
            setLogs(defaultMockMaintenance);
          }

          // Vehicles list
          const storedVehicles = localStorage.getItem('mock_vehicles');
          if (storedVehicles) {
            setVehicles(JSON.parse(storedVehicles));
          } else {
            localStorage.setItem('mock_vehicles', JSON.stringify(defaultMockVehicles));
            setVehicles(defaultMockVehicles);
          }

          setLoading(false);
        } catch {
          setError('Failed to load mock maintenance logs.');
          setLoading(false);
        }
      };

      loadMockData();

      // Custom window updates trigger
      const handleStorageUpdate = (e) => {
        if (
          e.key === 'mock_maintenance' || 
          e.key === 'mock_vehicles' || 
          e.type === 'mock-update'
        ) {
          loadMockData();
        }
      };

      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('mock-maintenance-updated', handleStorageUpdate);
      window.addEventListener('mock-vehicles-updated', handleStorageUpdate);

      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('mock-maintenance-updated', handleStorageUpdate);
        window.removeEventListener('mock-vehicles-updated', handleStorageUpdate);
      };
    } else {
      // Real Firebase Firestore Mode
      setLoading(true);
      const maintenanceCol = collection(db, 'maintenance');
      const vehiclesCol = collection(db, 'vehicles');

      // Subscribe to Maintenance Logs
      const unsubLogs = onSnapshot(maintenanceCol, (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        // Sort by date/createdAt descending (most recent first)
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLogs(list);
      }, () => setError('Error loading maintenance logs.'));

      // Subscribe to Vehicles
      const unsubVehicles = onSnapshot(vehiclesCol, (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ regNo: doc.id, ...doc.data() }));
        setVehicles(list);
      }, () => setError('Error loading vehicles database.'));

      setLoading(false);

      return () => {
        unsubLogs();
        unsubVehicles();
      };
    }
  }, [isMock]);

  // Helper trigger sync in Mock mode
  const triggerMockMaintenanceUpdate = (updatedLogs, updatedVehicles) => {
    localStorage.setItem('mock_maintenance', JSON.stringify(updatedLogs));
    localStorage.setItem('mock_vehicles', JSON.stringify(updatedVehicles));
    window.dispatchEvent(new Event('mock-maintenance-updated'));
    window.dispatchEvent(new Event('mock-vehicles-updated'));
  };

  // 2. Form Submission Handlers
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedVehicleId || !cost || !date) {
      setFormError('Please fill out all operational fields.');
      return;
    }

    const numCost = parseFloat(cost);
    if (isNaN(numCost) || numCost < 0) {
      setFormError('Service cost cannot be a negative number.');
      return;
    }

    const finalServiceType = serviceType === 'Other' 
      ? (customServiceType.trim() || 'Other') 
      : serviceType;

    setIsSaving(true);

    // Get selected vehicle's status to check if it's 'Retired'
    const vehicleObj = vehicles.find((v) => v.regNo === selectedVehicleId);
    const currentVehicleStatus = vehicleObj ? vehicleObj.status : 'Available';

    // Calculate new vehicle status based on the business rules:
    // If maintenance log is In Progress -> update vehicle status to 'In Shop'
    // If Completed -> update vehicle status to 'Available' (unless it is Retired)
    let newVehicleStatus = currentVehicleStatus;
    if (status === 'In Progress') {
      newVehicleStatus = 'In Shop';
    } else if (status === 'Completed') {
      newVehicleStatus = currentVehicleStatus === 'Retired' ? 'Retired' : 'Available';
    }

    const logData = {
      vehicleId: selectedVehicleId,
      serviceType: finalServiceType,
      cost: numCost,
      date,
      status
    };

    try {
      if (isMock) {
        // --- MOCK WRITE ---
        const newLog = {
          id: 'M-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          ...logData
        };

        const updatedLogs = [newLog, ...logs];
        
        // Update vehicle status in array
        const updatedVehicles = vehicles.map((v) => {
          if (v.regNo === selectedVehicleId) {
            return { ...v, status: newVehicleStatus };
          }
          return v;
        });

        triggerMockMaintenanceUpdate(updatedLogs, updatedVehicles);
      } else {
        // --- REAL FIRESTORE WRITE ---
        const newLogRef = doc(collection(db, 'maintenance'));
        await setDoc(newLogRef, logData);

        // Update Vehicle Status
        await updateDoc(doc(db, 'vehicles', selectedVehicleId), {
          status: newVehicleStatus
        });
      }

      // Reset Form fields
      setSelectedVehicleId('');
      setServiceType('Oil Change');
      setCustomServiceType('');
      setCost('');
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('In Progress');
    } catch {
      setFormError('Error logging maintenance record. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Mark Completed Handler
  const handleMarkComplete = async (log) => {
    setUpdatingLogId(log.id);
    
    // Find the linked vehicle status to check for 'Retired'
    const vehicleObj = vehicles.find((v) => v.regNo === log.vehicleId);
    const currentVehicleStatus = vehicleObj ? vehicleObj.status : 'Available';
    
    const newVehicleStatus = currentVehicleStatus === 'Retired' ? 'Retired' : 'Available';

    try {
      if (isMock) {
        // --- MOCK COMPLETE ---
        const updatedLogs = logs.map((l) => {
          if (l.id === log.id) return { ...l, status: 'Completed' };
          return l;
        });

        const updatedVehicles = vehicles.map((v) => {
          if (v.regNo === log.vehicleId) return { ...v, status: newVehicleStatus };
          return v;
        });

        triggerMockMaintenanceUpdate(updatedLogs, updatedVehicles);
      } else {
        // --- REAL FIRESTORE COMPLETE ---
        await updateDoc(doc(db, 'maintenance', log.id), { status: 'Completed' });
        await updateDoc(doc(db, 'vehicles', log.vehicleId), { status: newVehicleStatus });
      }
    } catch (err) {
      console.error('Error completing maintenance:', err);
      alert('Failed to complete maintenance. Please try again.');
    } finally {
      setUpdatingLogId(null);
    }
  };

  // 4. Client-side Filtering
  const filteredLogs = logs.filter((l) => {
    const term = searchTerm.toLowerCase().trim();
    const vehicleName = vehicles.find((v) => v.regNo === l.vehicleId)?.name || '';
    const matchesVehicleId = l.vehicleId.toLowerCase().includes(term);
    const matchesVehicleName = vehicleName.toLowerCase().includes(term);
    const matchesService = l.serviceType.toLowerCase().includes(term);
    return matchesVehicleId || matchesVehicleName || matchesService;
  });

  // Magnetic hover mouse event helpers
  const handleMouseMove = (e) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btnRef.current.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = 'translate(0px, 0px) scale(1)';
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Maintenance Logs</h2>
        <p className="text-sm text-gray-500 mt-1">Configure vehicle repairs, service costs, and shop status.</p>
      </div>

      {/* Database Error Alert */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">System Connection Issue</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
          <p className="text-sm font-semibold tracking-wider text-gray-400 font-mono uppercase">Syncing Maintenance Hub...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN - Form */}
          <section className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900 font-sans">Log Service Record</h3>
              <p className="text-xs text-gray-400 mt-1 font-mono">Stage: Shop Intake Portal</p>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <p className="font-bold">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Vehicle Dropdown (All Vehicles shown with current status label) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Vehicle</label>
                <select
                  value={selectedVehicleId}
                  required
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                >
                  <option value="">-- Select Vehicle (All) --</option>
                  {vehicles.map((v) => (
                    <option key={v.regNo} value={v.regNo}>
                      {v.regNo} ({v.name || v.type}) [{v.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Service Type</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-sans"
                  >
                    <option value="Oil Change">Oil Change</option>
                    <option value="Engine Repair">Engine Repair</option>
                    <option value="Tyre Replace">Tyre Replace</option>
                    <option value="General Service">General Service</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                {serviceType === 'Other' && (
                  <div className="animate-slide-in">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Specify Custom Service</label>
                    <input
                      type="text"
                      required
                      value={customServiceType}
                      onChange={(e) => setCustomServiceType(e.target.value)}
                      placeholder="e.g. Brake Replacement"
                      className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Cost & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Cost ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Maintenance Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-sans"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Save button */}
              <button
                ref={btnRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                type="submit"
                disabled={isSaving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-gray-900 border border-transparent shadow-sm hover:bg-amber-600 transition-all duration-300 ease-out btn-magnetic disabled:bg-gray-150 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Saving Record...</span>
                  </>
                ) : (
                  <>
                    <Wrench className="h-4.5 w-4.5 stroke-[2.2]" />
                    <span>Log Service Record</span>
                  </>
                )}
              </button>

            </form>

            {/* Visual note below the form */}
            <div className="flex flex-col gap-2 bg-gray-50 border border-gray-250 p-4 rounded-xl text-xs text-gray-600 font-sans">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> In Shop vehicles are removed from the dispatch pool. Completing maintenance restores Available status (unless Retired).
                </span>
              </div>
              {/* Transition Caption text diagram */}
              <div className="border-t border-gray-200 pt-2 mt-1 flex items-center justify-center gap-1.5 font-mono text-[10px] text-gray-400">
                <span>Available</span>
                <ArrowRight className="h-3 w-3 text-gray-300" />
                <span className="text-amber-500 font-bold">In Shop</span>
                <span className="mx-1 text-gray-200">|</span>
                <span className="text-amber-500 font-bold">In Shop</span>
                <ArrowRight className="h-3 w-3 text-gray-300" />
                <span>Available (unless Retired)</span>
              </div>
            </div>

          </section>

          {/* RIGHT COLUMN - Service Log Table */}
          <section className="lg:col-span-7 space-y-4">
            
            {/* Header & Search */}
            <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 font-sans">Service History</h3>
                <span className="text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md uppercase font-bold">
                  intake register
                </span>
              </div>

              {/* Search box filter */}
              <div className="relative max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search by vehicle ID, name, or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-sans"
                />
              </div>
            </div>

            {/* Service Log Table */}
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm text-center">
                <Info className="h-8 w-8 text-gray-300 mb-2 animate-bounce" />
                <p className="text-sm font-semibold text-gray-400 font-mono uppercase">No maintenance logs found</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Vehicle</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Service Details</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Cost</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Status</th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm font-sans">
                      {filteredLogs.map((log) => {
                        const vehicleObj = vehicles.find((v) => v.regNo === log.vehicleId);
                        return (
                          <tr key={log.id} className="hover:bg-amber-50/10 transition-colors duration-150">
                            
                            {/* Vehicle ID & Name in bold mono */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono font-bold text-gray-900 block">{log.vehicleId}</span>
                              {vehicleObj && (
                                <span className="text-xs text-gray-400 block mt-0.5">({vehicleObj.name})</span>
                              )}
                            </td>

                            {/* Service Details & Date */}
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-800 block">{log.serviceType}</span>
                              <span className="text-[10px] text-gray-400 font-mono block mt-1 flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-gray-300" />
                                {log.date}
                              </span>
                            </td>

                            {/* Cost in JetBrains Mono */}
                            <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-gray-800">
                              ${log.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>

                            {/* Status colored pill badge */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                log.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  log.status === 'In Progress' ? 'bg-amber-500 animate-pulse' :
                                  'bg-emerald-500'
                                }`}></span>
                                {log.status === 'In Progress' ? 'In Shop' : 'Completed'}
                              </span>
                            </td>

                            {/* Mark complete action button */}
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                              {log.status === 'In Progress' ? (
                                <button
                                  onClick={() => handleMarkComplete(log)}
                                  disabled={updatingLogId === log.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors shadow-xs cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                  {updatingLogId === log.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  <span>Mark Complete</span>
                                </button>
                              ) : (
                                <span className="text-gray-400 font-mono text-[10px]">Closed</span>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </section>

        </div>
      )}
      
      {/* Dynamic Slide-in animation helper */}
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

    </div>
  );
}
