import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore';
import { 
  Fuel, 
  Plus, 
  X, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  Info, 
  DollarSign, 
  Coins, 
  FileText,
  TrendingUp
} from 'lucide-react';

// Default mock data for testing/demo fallback
const defaultMockFuelLogs = [
  { id: 'FL-001', vehicleId: 'NY-4921-TR', liters: 120, cost: 186.50, date: '2026-07-11' },
  { id: 'FL-002', vehicleId: 'CA-8891-BX', liters: 45, cost: 72.90, date: '2026-07-10' }
];

const defaultMockExpenses = [
  { id: 'EXP-001', tripId: 'T-101', vehicleId: 'NY-4921-TR', toll: 45.00, other: 15.00, date: '2026-07-11' },
  { id: 'EXP-002', tripId: '', vehicleId: 'CA-8891-BX', toll: 0.00, other: 35.00, date: '2026-07-10' }
];

export default function FuelExpenses() {
  const { isMock } = useAuth();

  // Collections state
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Visibility States
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Form States - Fuel Log
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelFormError, setFuelFormError] = useState('');
  const [fuelSaving, setFuelSaving] = useState(false);

  // Form States - Expense Log
  const [expenseTripId, setExpenseTripId] = useState('');
  const [expenseVehicleId, setExpenseVehicleId] = useState('');
  const [expenseToll, setExpenseToll] = useState('');
  const [expenseOther, setExpenseOther] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseFormError, setExpenseFormError] = useState('');
  const [expenseSaving, setExpenseSaving] = useState(false);

  // 1. Data synchronization
  useEffect(() => {
    if (isMock) {
      // Mock Storage Mode
      const loadMockData = () => {
        try {
          // Fuel Logs
          const storedFuel = localStorage.getItem('mock_fuel_logs');
          if (storedFuel) {
            setFuelLogs(JSON.parse(storedFuel));
          } else {
            localStorage.setItem('mock_fuel_logs', JSON.stringify(defaultMockFuelLogs));
            setFuelLogs(defaultMockFuelLogs);
          }

          // Expenses
          const storedExpenses = localStorage.getItem('mock_expenses');
          if (storedExpenses) {
            setExpenses(JSON.parse(storedExpenses));
          } else {
            localStorage.setItem('mock_expenses', JSON.stringify(defaultMockExpenses));
            setExpenses(defaultMockExpenses);
          }

          // Vehicles
          const storedVehicles = localStorage.getItem('mock_vehicles');
          if (storedVehicles) {
            setVehicles(JSON.parse(storedVehicles));
          }

          // Maintenance
          const storedMaint = localStorage.getItem('mock_maintenance');
          if (storedMaint) {
            setMaintenance(JSON.parse(storedMaint));
          }

          // Trips
          const storedTrips = localStorage.getItem('mock_trips');
          if (storedTrips) {
            setTrips(JSON.parse(storedTrips));
          }

          setLoading(false);
        } catch (err) {
          setError('Failed to load mock databases.');
          setLoading(false);
        }
      };

      loadMockData();

      // Setup window listeners for cross-panel sync
      const handleStorageUpdate = () => {
        loadMockData();
      };

      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('mock-vehicles-updated', handleStorageUpdate);
      window.addEventListener('mock-trips-updated', handleStorageUpdate);
      window.addEventListener('mock-maintenance-updated', handleStorageUpdate);
      window.addEventListener('mock-fuel-logs-updated', handleStorageUpdate);
      window.addEventListener('mock-expenses-updated', handleStorageUpdate);

      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('mock-vehicles-updated', handleStorageUpdate);
        window.removeEventListener('mock-trips-updated', handleStorageUpdate);
        window.removeEventListener('mock-maintenance-updated', handleStorageUpdate);
        window.removeEventListener('mock-fuel-logs-updated', handleStorageUpdate);
        window.removeEventListener('mock-expenses-updated', handleStorageUpdate);
      };
    } else {
      // Real Firebase Mode
      setLoading(true);
      
      const unsubFuel = onSnapshot(collection(db, 'fuelLogs'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setFuelLogs(list);
      }, () => setError('Error loading fuel logs database.'));

      const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setExpenses(list);
      }, () => setError('Error loading expenses database.'));

      const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ regNo: doc.id, ...doc.data() }));
        setVehicles(list);
      }, () => setError('Error loading vehicles database.'));

      const unsubMaint = onSnapshot(collection(db, 'maintenance'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setMaintenance(list);
      }, () => setError('Error loading maintenance logs.'));

      const unsubTrips = onSnapshot(collection(db, 'trips'), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setTrips(list);
      }, () => setError('Error loading trips database.'));

      setLoading(false);

      return () => {
        unsubFuel();
        unsubExpenses();
        unsubVehicles();
        unsubMaint();
        unsubTrips();
      };
    }
  }, [isMock]);

  // 2. Computed values
  const getLinkedMaintenance = (vehicleId) => {
    if (!vehicleId) return 0;
    return maintenance
      .filter((m) => m.vehicleId === vehicleId)
      .reduce((sum, m) => sum + Number(m.cost || 0), 0);
  };

  const totalFuelCost = fuelLogs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((sum, log) => sum + Number(log.cost || 0), 0);
  const grandOperationalTotal = totalFuelCost + totalMaintenanceCost;

  // 3. Form Submit Handlers
  const handleSaveFuel = async (e) => {
    e.preventDefault();
    setFuelFormError('');

    if (!fuelVehicleId || !fuelLiters || !fuelCost || !fuelDate) {
      setFuelFormError('All fields are required.');
      return;
    }

    const litersNum = parseFloat(fuelLiters);
    const costNum = parseFloat(fuelCost);

    if (isNaN(litersNum) || litersNum <= 0) {
      setFuelFormError('Liters must be a positive number.');
      return;
    }

    if (isNaN(costNum) || costNum <= 0) {
      setFuelFormError('Fuel cost must be a positive number.');
      return;
    }

    setFuelSaving(true);

    const logData = {
      vehicleId: fuelVehicleId,
      liters: litersNum,
      cost: costNum,
      date: fuelDate
    };

    try {
      if (isMock) {
        const newLog = {
          id: 'FL-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          ...logData
        };
        const updatedFuel = [newLog, ...fuelLogs];
        localStorage.setItem('mock_fuel_logs', JSON.stringify(updatedFuel));
        window.dispatchEvent(new Event('mock-fuel-logs-updated'));
      } else {
        const newLogRef = doc(collection(db, 'fuelLogs'));
        await setDoc(newLogRef, logData);
      }

      // Reset fields
      setFuelVehicleId('');
      setFuelLiters('');
      setFuelCost('');
      setFuelDate(new Date().toISOString().split('T')[0]);
      setIsFuelModalOpen(false);
    } catch (err) {
      setFuelFormError('Error saving fuel record. Please try again.');
    } finally {
      setFuelSaving(false);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setExpenseFormError('');

    const isTripLinked = expenseTripId !== '';
    let finalVehicleId = expenseVehicleId;

    if (isTripLinked) {
      // Find vehicle from selected trip
      const linkedTripObj = trips.find((t) => t.id === expenseTripId);
      if (linkedTripObj) {
        finalVehicleId = linkedTripObj.vehicleId;
      } else {
        setExpenseFormError('Invalid trip selection.');
        return;
      }
    }

    if (!finalVehicleId) {
      setExpenseFormError('Please select a vehicle or select a valid trip.');
      return;
    }

    if (!expenseDate) {
      setExpenseFormError('Date is required.');
      return;
    }

    const tollNum = expenseToll === '' ? 0 : parseFloat(expenseToll);
    const otherNum = expenseOther === '' ? 0 : parseFloat(expenseOther);

    if (isNaN(tollNum) || tollNum < 0) {
      setExpenseFormError('Toll cost cannot be negative.');
      return;
    }

    if (isNaN(otherNum) || otherNum < 0) {
      setExpenseFormError('Other cost cannot be negative.');
      return;
    }

    if (tollNum === 0 && otherNum === 0) {
      setExpenseFormError('Please input at least one expense value (Toll or Other).');
      return;
    }

    setExpenseSaving(true);

    const expenseData = {
      tripId: expenseTripId || '',
      vehicleId: finalVehicleId,
      toll: tollNum,
      other: otherNum,
      date: expenseDate
    };

    try {
      if (isMock) {
        const newExpense = {
          id: 'EXP-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          ...expenseData
        };
        const updatedExpenses = [newExpense, ...expenses];
        localStorage.setItem('mock_expenses', JSON.stringify(updatedExpenses));
        window.dispatchEvent(new Event('mock-expenses-updated'));
      } else {
        const newExpenseRef = doc(collection(db, 'expenses'));
        await setDoc(newExpenseRef, expenseData);
      }

      // Reset fields
      setExpenseTripId('');
      setExpenseVehicleId('');
      setExpenseToll('');
      setExpenseOther('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setIsExpenseModalOpen(false);
    } catch (err) {
      setExpenseFormError('Error saving expense record. Please try again.');
    } finally {
      setExpenseSaving(false);
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status) => {
    const normalized = (status || 'Available').toLowerCase();
    if (normalized === 'available') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-green-50 text-green-700 border border-green-200">
          Available
        </span>
      );
    }
    if (normalized === 'on trip') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
          On Trip
        </span>
      );
    }
    if (normalized === 'in shop') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
          In Shop
        </span>
      );
    }
    if (normalized === 'retired') {
      return (
        <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-gray-100 text-gray-500 border border-gray-250">
          Retired
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-gray-50 text-gray-600 border border-gray-200">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-20 relative">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight font-sans">Fuel & Expense Management</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Track fuel receipts, toll logs, and miscellaneous transport costs.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-850/30 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-md uppercase font-bold">
            financial portal
          </span>
        </div>
      </div>

      {/* Database Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-955/20 text-sm text-red-800 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">System Connection Issue</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
          <p className="text-sm font-semibold tracking-wider text-gray-400 dark:text-slate-550 font-mono uppercase">Syncing financial reports...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* SECTION 1 - Fuel Logs */}
          <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-850 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-amber-500" />
                  <span>Fuel Intake Logs</span>
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Real-time fuel refills and cost allocation.</p>
              </div>
              <button
                onClick={() => setIsFuelModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-4 py-2.5 text-sm transition-all shadow-sm cursor-pointer duration-200"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>Log Fuel</span>
              </button>
            </div>

            {fuelLogs.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900">
                <Info className="h-8 w-8 text-gray-300 dark:text-slate-550 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 font-mono uppercase">No fuel logs loaded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-850">
                  <thead className="bg-gray-50 dark:bg-slate-800/40">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Vehicle</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Date</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Liters</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Fuel Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-850 text-sm font-sans">
                    {fuelLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-amber-50/5 dark:hover:bg-amber-955/10 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-gray-900 dark:text-slate-100">
                          {log.vehicleId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-600 dark:text-slate-400">
                          {log.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-800 dark:text-slate-305">
                          {log.liters} L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-amber-500 dark:text-amber-400">
                          ${Number(log.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECTION 2 - Other Expenses */}
          <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-850 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <span>Other Expenses (Toll / Misc)</span>
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Route tolls, driver expenses, and linked maintenance metrics.</p>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-4 py-2.5 text-sm transition-all shadow-sm cursor-pointer duration-200"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>Add Expense</span>
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900">
                <Info className="h-8 w-8 text-gray-300 dark:text-slate-550 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 font-mono uppercase">No expense records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-850">
                  <thead className="bg-gray-50 dark:bg-slate-800/40">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Trip</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Vehicle</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Toll</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Other</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Maint. (linked)</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Total</th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 font-mono">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-850 text-sm font-sans">
                    {expenses.map((expense) => {
                      const linkedMaintCost = getLinkedMaintenance(expense.vehicleId);
                      const totalCost = Number(expense.toll || 0) + Number(expense.other || 0) + linkedMaintCost;
                      const matchedVehicle = vehicles.find((v) => v.regNo === expense.vehicleId);
                      const vehicleStatus = matchedVehicle ? matchedVehicle.status : 'Available';

                      return (
                        <tr key={expense.id} className="hover:bg-amber-50/5 dark:hover:bg-amber-955/10 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-gray-700 dark:text-slate-350">
                            {expense.tripId || <span className="text-gray-300 dark:text-slate-600 font-normal">N/A (Direct)</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-gray-900 dark:text-slate-100">
                            {expense.vehicleId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-700 dark:text-slate-350">
                            ${Number(expense.toll || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-700 dark:text-slate-350">
                            ${Number(expense.other || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-500 dark:text-slate-400">
                            ${linkedMaintCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-gray-900 dark:text-slate-100">
                            ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {renderStatusBadge(vehicleStatus)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* BOTTOM SUMMARY BAR */}
          <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <TrendingUp className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-sans">
                  Total Operational Cost (Auto)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Calculated dynamically: Sum of all Fuel logs + Maintenance costs.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-amber-500 font-mono block mb-1">FUEL + MAINTENANCE</span>
              <span className="text-3xl font-bold font-mono tracking-tight text-amber-500">
                ${grandOperationalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: LOG FUEL */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFuelModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-850 bg-gray-50/50 dark:bg-slate-850/20">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Fuel className="h-5 w-5 text-amber-500" />
                <span>Log Fuel Intake</span>
              </h3>
              <button 
                onClick={() => setIsFuelModalOpen(false)}
                className="h-8 w-8 rounded-xl border border-gray-150 dark:border-slate-800 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {fuelFormError && (
              <div className="mx-6 mt-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/60 dark:bg-red-955/20 p-3 text-xs text-red-800 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <p className="font-bold">{fuelFormError}</p>
              </div>
            )}

            <form onSubmit={handleSaveFuel} className="p-6 space-y-4">
              {/* Vehicle Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Vehicle</label>
                <select
                  value={fuelVehicleId}
                  required
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 px-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                >
                  <option value="">Select a vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.regNo} value={v.regNo}>
                      {v.regNo} {v.name ? `(${v.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    type="date"
                    required
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                  />
                </div>
              </div>

              {/* Liters input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Liters Refueled (L)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="e.g. 120"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 px-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                />
              </div>

              {/* Fuel Cost input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Fuel Cost ($)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="e.g. 186.50"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-350 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fuelSaving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-gray-900 hover:bg-amber-600 transition-colors disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                >
                  {fuelSaving ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Log Fuel</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsExpenseModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-850 bg-gray-50/50 dark:bg-slate-850/20">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                <span>Add Expense Record</span>
              </h3>
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="h-8 w-8 rounded-xl border border-gray-150 dark:border-slate-800 flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {expenseFormError && (
              <div className="mx-6 mt-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/60 dark:bg-red-955/20 p-3 text-xs text-red-800 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <p className="font-bold">{expenseFormError}</p>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              {/* Linked Trip selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Linked Trip</label>
                <select
                  value={expenseTripId}
                  onChange={(e) => {
                    const selectTripId = e.target.value;
                    setExpenseTripId(selectTripId);
                    if (selectTripId) {
                      // Find vehicle for that trip and lock/auto-select it
                      const tripObj = trips.find((t) => t.id === selectTripId);
                      if (tripObj) {
                        setExpenseVehicleId(tripObj.vehicleId);
                      }
                    } else {
                      setExpenseVehicleId('');
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 px-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                >
                  <option value="">No Trip (General Vehicle Expense)</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} ({t.source} → {t.destination})
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Selection (Only modifiable if no trip is linked) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Vehicle</label>
                <select
                  value={expenseVehicleId}
                  disabled={expenseTripId !== ''}
                  required
                  onChange={(e) => setExpenseVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="">Select a vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.regNo} value={v.regNo}>
                      {v.regNo} {v.name ? `(${v.name})` : ''}
                    </option>
                  ))}
                </select>
                {expenseTripId !== '' && (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Vehicle auto-detected from the selected dispatch trip.</p>
                )}
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Toll cost */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Toll Cost ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                      <Coins className="h-4 w-4" />
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 45"
                      value={expenseToll}
                      onChange={(e) => setExpenseToll(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                    />
                  </div>
                </div>

                {/* Other cost */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Other Cost ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                      <FileText className="h-4 w-4" />
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 15"
                      value={expenseOther}
                      onChange={(e) => setExpenseOther(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-350 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseSaving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-gray-900 hover:bg-amber-600 transition-colors disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                >
                  {expenseSaving ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add Expense</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
