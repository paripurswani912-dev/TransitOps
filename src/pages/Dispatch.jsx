import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import {
  Send,
  Loader2,
  AlertCircle,
  Gauge,
  Droplet,
  ArrowRight,
  Info
} from 'lucide-react';
import { LOCATIONS } from '../constants/locations';
import { RBAC_MATRIX } from '../constants/rbac';

// Default mock data for Trips
const defaultMockTrips = [];

const defaultMockVehicles = [];

const defaultMockDrivers = [];

export default function Dispatch() {
  const { isMock, role } = useAuth();
  const permissions = RBAC_MATRIX[role] || {};
  const isReadOnly = permissions['/dispatch'] === 'view';

  // Collections State
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form Inputs State
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [plannedDistance, setPlannedDistance] = useState('');

  // Active validation warning & error states
  const [formError, setFormError] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  // Inline Complete Trip inputs state
  const [completingTripId, setCompletingTripId] = useState(null);
  const [finalOdometer, setFinalOdometer] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Refs for magnetic hover effect
  const btnRef = useRef(null);

  // 1. Data synchronization across vehicles, drivers, and trips
  useEffect(() => {
    if (isMock) {
      // Mock Storage Mode
      const loadMockData = () => {
        try {
          // Trips
          const storedTrips = localStorage.getItem('mock_trips');
          if (storedTrips) {
            setTrips(JSON.parse(storedTrips));
          } else {
            localStorage.setItem('mock_trips', JSON.stringify(defaultMockTrips));
            setTrips(defaultMockTrips);
          }

          // Vehicles
          const storedVehicles = localStorage.getItem('mock_vehicles');
          if (storedVehicles) {
            setVehicles(JSON.parse(storedVehicles));
          } else {
            localStorage.setItem('mock_vehicles', JSON.stringify(defaultMockVehicles));
            setVehicles(defaultMockVehicles);
          }

          // Drivers
          const storedDrivers = localStorage.getItem('mock_drivers');
          if (storedDrivers) {
            setDrivers(JSON.parse(storedDrivers));
          } else {
            localStorage.setItem('mock_drivers', JSON.stringify(defaultMockDrivers));
            setDrivers(defaultMockDrivers);
          }

          setLoading(false);
        } catch {
          setError('Failed to load mock data collections.');
          setLoading(false);
        }
      };

      loadMockData();

      // Multi-collection storage event listener to maintain live sync
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

      const tripsCol = collection(db, 'trips');
      const vehiclesCol = collection(db, 'vehicles');
      const driversCol = collection(db, 'drivers');

      // Sync Trips
      const unsubTrips = onSnapshot(tripsCol, (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        // Sort by createdAt descending (most recent first)
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTrips(list);
      }, () => setError('Error loading trips database.'));

      // Sync Vehicles
      const unsubVehicles = onSnapshot(vehiclesCol, (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ regNo: doc.id, ...doc.data() }));
        setVehicles(list);
      }, () => setError('Error loading vehicles database.'));

      // Sync Drivers
      const unsubDrivers = onSnapshot(driversCol, (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setDrivers(list);
      }, () => setError('Error loading drivers database.'));

      setLoading(false);

      return () => {
        unsubTrips();
        unsubVehicles();
        unsubDrivers();
      };
    }
  }, [isMock]);

  // Helper trigger sync in Mock mode
  const triggerMockDispatchUpdate = (updatedTrips, updatedVehicles, updatedDrivers, newFuelLog) => {
    localStorage.setItem('mock_trips', JSON.stringify(updatedTrips));
    localStorage.setItem('mock_vehicles', JSON.stringify(updatedVehicles));
    localStorage.setItem('mock_drivers', JSON.stringify(updatedDrivers));
    if (newFuelLog) {
      const storedLogs = JSON.parse(localStorage.getItem('mock_fuel_logs') || '[]');
      localStorage.setItem('mock_fuel_logs', JSON.stringify([...storedLogs, newFuelLog]));
    }
    // Dispatch local custom events to notify other screens
    window.dispatchEvent(new Event('mock-trips-updated'));
    window.dispatchEvent(new Event('mock-vehicles-updated'));
    window.dispatchEvent(new Event('mock-drivers-updated'));
  };

  // Helper to check if a driver's license is expired
  const isLicenseExpired = (expiryDateStr) => {
    if (!expiryDateStr) return false;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  // 2. Dropdown Filter Calculations
  // ONLY show vehicles with status = 'Available'
  const availableVehicles = vehicles.filter((v) => v.status === 'Available');

  // ONLY show drivers with status = 'Available' AND licenseExpiry >= today AND status != 'Suspended'
  const availableDrivers = drivers.filter(
    (d) => d.status === 'Available' && d.status !== 'Suspended' && !isLicenseExpired(d.licenseExpiry)
  );

  // 3. Live route and capacity validation checking
  const selectedVehicleObj = vehicles.find((v) => v.regNo === selectedVehicleId);
  const cargoWeightNum = parseFloat(cargoWeight);

  const isCapacityExceeded =
    selectedVehicleObj &&
    !isNaN(cargoWeightNum) &&
    cargoWeightNum > selectedVehicleObj.capacity;

  const capacityDifference = isCapacityExceeded
    ? cargoWeightNum - selectedVehicleObj.capacity
    : 0;

  const isSameLocation = source && destination && source === destination;

  // 4. Form Submit handler
  const handleDispatch = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!source || !destination || !selectedVehicleId || !selectedDriverId || !cargoWeight || !plannedDistance) {
      setFormError('Please fill out all operational fields.');
      return;
    }

    if (isSameLocation) {
      setFormError('Source and Destination cannot be the same.');
      return;
    }

    if (isCapacityExceeded) {
      setFormError('Dispatch blocked: cargo weight exceeds vehicle capacity.');
      return;
    }

    setIsDispatching(true);

    const tripData = {
      source: source.trim(),
      destination: destination.trim(),
      vehicleId: selectedVehicleId,
      driverId: selectedDriverId,
      cargoWeight: parseFloat(cargoWeight),
      plannedDistance: parseFloat(plannedDistance),
      status: 'Dispatched',
      createdAt: new Date().toISOString()
    };

    try {
      if (isMock) {
        // --- MOCK STORAGE ---
        const newTrip = {
          id: 'TR-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          ...tripData
        };

        const updatedTrips = [newTrip, ...trips];

        // Update vehicle status
        const updatedVehicles = vehicles.map((v) => {
          if (v.regNo === selectedVehicleId) return { ...v, status: 'On Trip' };
          return v;
        });

        // Update driver status
        const updatedDrivers = drivers.map((d) => {
          if (d.id === selectedDriverId) return { ...d, status: 'On Trip' };
          return d;
        });

        triggerMockDispatchUpdate(updatedTrips, updatedVehicles, updatedDrivers, null);
      } else {
        // --- REAL FIRESTORE SEQUENTIAL UPDATES ---
        const newTripRef = doc(collection(db, 'trips'));
        await setDoc(newTripRef, tripData);

        // Update vehicle status
        await updateDoc(doc(db, 'vehicles', selectedVehicleId), { status: 'On Trip' });

        // Update driver status
        await updateDoc(doc(db, 'drivers', selectedDriverId), { status: 'On Trip' });
      }

      // Reset Form fields
      setSource('');
      setDestination('');
      setSelectedVehicleId('');
      setSelectedDriverId('');
      setCargoWeight('');
      setPlannedDistance('');
    } catch {
      setFormError('Error completing secure dispatch tunnel. Please retry.');
    } finally {
      setIsDispatching(false);
    }
  };

  // 5. Card Complete Actions
  const handleOpenCompleteInline = (trip) => {
    const vehicleObj = vehicles.find((v) => v.regNo === trip.vehicleId);
    setCompletingTripId(trip.id);
    setInlineError('');
    // Prefill suggestions
    setFinalOdometer(vehicleObj ? String(vehicleObj.odometer + Math.round(trip.plannedDistance)) : '');
    setFuelConsumed(String(Math.round(trip.plannedDistance * 0.35))); // rough lit/km estimate
  };

  const handleSaveCompletion = async (trip) => {
    setInlineError('');
    const odoNum = parseFloat(finalOdometer);
    const fuelNum = parseFloat(fuelConsumed);

    const vehicleObj = vehicles.find((v) => v.regNo === trip.vehicleId);
    const currentOdometer = vehicleObj ? vehicleObj.odometer : 0;

    if (isNaN(odoNum) || odoNum < currentOdometer) {
      setInlineError(`Final odometer must be greater than or equal to current odometer (${currentOdometer.toLocaleString()} km)`);
      return;
    }

    if (isNaN(fuelNum) || fuelNum <= 0) {
      setInlineError('Please input a valid positive number for fuel consumed.');
      return;
    }

    setIsCompleting(true);

    try {
      if (isMock) {
        // --- MOCK COMPLETE ---
        const updatedTrips = trips.map((t) => {
          if (t.id === trip.id) {
            return {
              ...t,
              status: 'Completed',
              finalOdometer: odoNum,
              fuelConsumed: fuelNum
            };
          }
          return t;
        });

        const updatedVehicles = vehicles.map((v) => {
          if (v.regNo === trip.vehicleId) {
            return { ...v, status: 'Available', odometer: odoNum };
          }
          return v;
        });

        const updatedDrivers = drivers.map((d) => {
          if (d.id === trip.driverId) {
            return { ...d, status: 'Available' };
          }
          return d;
        });

        const newFuelLog = {
          id: 'FL-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          vehicleId: trip.vehicleId,
          liters: fuelNum,
          cost: fuelNum * 1.45,
          date: new Date().toISOString().split('T')[0]
        };

        triggerMockDispatchUpdate(updatedTrips, updatedVehicles, updatedDrivers, newFuelLog);
      } else {
        // --- REAL FIRESTORE COMPLETE ---
        // Update Trip
        await updateDoc(doc(db, 'trips', trip.id), {
          status: 'Completed',
          finalOdometer: odoNum,
          fuelConsumed: fuelNum
        });

        // Update Vehicle
        await updateDoc(doc(db, 'vehicles', trip.vehicleId), {
          status: 'Available',
          odometer: odoNum
        });

        // Update Driver
        await updateDoc(doc(db, 'drivers', trip.driverId), {
          status: 'Available'
        });

        // Create Fuel Log
        const fuelLogRef = doc(collection(db, 'fuelLogs'));
        await setDoc(fuelLogRef, {
          vehicleId: trip.vehicleId,
          liters: fuelNum,
          cost: fuelNum * 1.45,
          date: new Date().toISOString().split('T')[0]
        });
      }

      setCompletingTripId(null);
    } catch {
      setInlineError('Error processing trip completion update.');
    } finally {
      setIsCompleting(false);
    }
  };

  // 6. Card Cancel Action
  const handleCancelTrip = async (trip) => {
    const confirmCancel = window.confirm(`Are you sure you want to cancel dispatch trip: ${trip.id}?`);
    if (!confirmCancel) return;

    try {
      if (isMock) {
        // --- MOCK CANCEL ---
        const updatedTrips = trips.map((t) => {
          if (t.id === trip.id) return { ...t, status: 'Cancelled' };
          return t;
        });

        const updatedVehicles = vehicles.map((v) => {
          if (v.regNo === trip.vehicleId) return { ...v, status: 'Available' };
          return v;
        });

        const updatedDrivers = drivers.map((d) => {
          if (d.id === trip.driverId) return { ...d, status: 'Available' };
          return d;
        });

        triggerMockDispatchUpdate(updatedTrips, updatedVehicles, updatedDrivers, null);
      } else {
        // --- REAL FIRESTORE CANCEL ---
        await updateDoc(doc(db, 'trips', trip.id), { status: 'Cancelled' });
        await updateDoc(doc(db, 'vehicles', trip.vehicleId), { status: 'Available' });
        await updateDoc(doc(db, 'drivers', trip.driverId), { status: 'Available' });
      }
    } catch (err) {
      console.error('Error cancelling trip:', err);
      alert('Failed to cancel the trip. Please try again.');
    }
  };

  const handleDeleteTrip = async (trip) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete completed trip record: ${trip.id}?`);
    if (!confirmDelete) return;

    try {
      if (isMock) {
        const updatedTrips = trips.filter(t => t.id !== trip.id);
        triggerMockDispatchUpdate(updatedTrips, vehicles, drivers, null);
      } else {
        await deleteDoc(doc(db, 'trips', trip.id));
      }
    } catch (err) {
      console.error('Error deleting trip:', err);
      alert('Failed to delete the trip record. Please try again.');
    }
  };

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
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight font-sans">Trip Dispatcher</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Dispatch verified allocations and track delivery life-boards in real-time.</p>
      </div>

      {/* Database Error Alert */}
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-955/20 text-sm text-red-800 dark:text-red-400 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">System Connection Issue</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
          <p className="text-sm font-semibold tracking-wider text-gray-400 dark:text-slate-555 font-mono uppercase">Syncing Operations Hub...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN - Create Trip form */}
          <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 font-sans">Create Trip</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 font-mono">Stage: Preparation Tunnel</p>
            </div>

            {/* Trip Lifecycle Stepper */}
            <div className="px-2">
              <div className="flex items-center justify-between relative">
                {/* Connector Line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 dark:bg-slate-800 -z-0"></div>
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-amber-500 transition-all duration-300 -z-0"
                  style={{ width: '0%' }} // Since draft is the 1st step, filled width is 0%
                ></div>

                {/* Steps */}
                {[
                  { key: 'Draft', label: 'Draft' },
                  { key: 'Dispatched', label: 'Dispatched' },
                  { key: 'Completed', label: 'Completed' },
                  { key: 'Cancelled', label: 'Cancelled' }
                ].map((step, idx) => {
                  const isActive = step.key === 'Draft';
                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center border-2 text-[9px] font-bold font-mono transition-all duration-300 ${isActive
                          ? 'bg-amber-500 border-amber-500 text-gray-900 shadow-sm ring-4 ring-amber-500/10'
                          : 'bg-white border-gray-200 text-gray-400'
                        }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[10px] font-bold font-sans mt-1.5 transition-colors ${isActive ? 'text-amber-600' : 'text-gray-400 dark:text-slate-500'
                        }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Error Alert */}
            {formError && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/60 dark:bg-red-955/20 p-3 text-xs text-red-800 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <p className="font-bold">{formError}</p>
              </div>
            )}

            {/* Read-Only Warning Banner */}
            {isReadOnly && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-955/20 p-4 text-xs text-blue-800 dark:text-blue-400 flex items-start gap-2.5">
                <Info className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Read-Only Workspace</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">You can review active trip logs and resource allocations, but dispatch commands are locked.</p>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleDispatch} className="space-y-4">

              {/* Route: Source and Destination Selects */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Source</label>
                  <select
                    value={source}
                    required
                    disabled={isReadOnly}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 px-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Source --</option>
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Destination</label>
                  <select
                    value={destination}
                    required
                    disabled={isReadOnly}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 px-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Destination --</option>
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vehicle Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Vehicle</label>
                <select
                  value={selectedVehicleId}
                  required
                  disabled={isReadOnly}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-850 py-2.5 px-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-550 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Available Vehicle --</option>
                  {availableVehicles.map((v) => (
                    <option key={v.regNo} value={v.regNo}>
                      {v.regNo} ({v.name || v.type}) — {v.capacity.toLocaleString()} kg max
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">⚠️ No available vehicles in dock.</p>
                )}
              </div>

              {/* Driver Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Driver</label>
                <select
                  value={selectedDriverId}
                  required
                  disabled={isReadOnly}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-855 py-2.5 px-3 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-sans disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  <option value="">-- Select Available Driver --</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id} className="font-mono font-medium">
                      {d.name} ({d.licenseCategory}) — rating: {d.safetyScore}/100
                    </option>
                  ))}
                </select>
                {availableDrivers.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">⚠️ No compliant drivers available.</p>
                )}
              </div>

              {/* Cargo Weight and Planned Distance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Cargo Weight (kg)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    disabled={isReadOnly}
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-855 py-2 px-3 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-550 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Distance (km)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    disabled={isReadOnly}
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    placeholder="e.g. 240"
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-855 py-2 px-3 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-550 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Live Same Location Validation Warning */}
              {isSameLocation && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-4 text-xs text-red-800 dark:text-red-400 flex items-start gap-3 animate-shake">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Route Validation Error</p>
                    <p className="text-xs text-red-600 leading-normal mt-1">
                      Source and Destination cannot be the same
                    </p>
                  </div>
                </div>
              )}

              {/* Live Capacity Validation Warning */}
              {isCapacityExceeded && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-3 animate-shake">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Overweight Alarm</p>
                    <p className="text-xs text-red-600 leading-normal mt-1">
                      Vehicle Capacity <span className="font-mono font-bold text-gray-900 dark:text-slate-150">{selectedVehicleObj.capacity.toLocaleString()} kg</span> / Cargo Weight <span className="font-mono font-bold text-gray-900 dark:text-slate-150">{cargoWeightNum.toLocaleString()} kg</span> — Capacity exceeded by <span className="font-mono font-bold text-gray-900 dark:text-slate-150">{capacityDifference.toLocaleString()} kg</span> → dispatch blocked
                    </p>
                  </div>
                </div>
              )}

              {/* Submit / Reset Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => {
                    setSource('');
                    setDestination('');
                    setSelectedVehicleId('');
                    setSelectedDriverId('');
                    setCargoWeight('');
                    setPlannedDistance('');
                    setFormError('');
                  }}
                  className="flex-1 py-3 text-sm border border-gray-300 dark:border-slate-700 rounded-xl font-semibold text-gray-700 dark:text-slate-350 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  ref={btnRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  type="submit"
                  disabled={isReadOnly || isDispatching || isCapacityExceeded || isSameLocation || !selectedVehicleId || !selectedDriverId || !source || !destination || !cargoWeight || !plannedDistance}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-gray-900 border border-transparent shadow-sm hover:bg-amber-600 transition-all duration-300 ease-out btn-magnetic disabled:bg-gray-150 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Tunneling...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4.5 w-4.5 stroke-[2.2]" />
                      <span>Dispatch</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </section>

          {/* RIGHT COLUMN - Live Board */}
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-3 bg-white dark:bg-slate-900 p-4 rounded-t-2xl border dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 font-sans">Live Board</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">Real-Time Operational Dispatch Trackers</p>
              </div>
              <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-850/30 text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded-md uppercase font-bold animate-pulse">
                live feed sync
              </span>
            </div>

            {trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm text-center">
                <Info className="h-8 w-8 text-gray-300 dark:text-slate-555 mb-2 animate-bounce" />
                <p className="text-sm font-semibold text-gray-400 dark:text-slate-550 font-mono uppercase">No active trip logs found</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[660px] overflow-y-auto pr-1">
                {trips.map((trip) => {
                  const vehicleObj = vehicles.find((v) => v.regNo === trip.vehicleId);
                  const driverObj = drivers.find((d) => d.id === trip.driverId);
                  const etaHours = Math.round(trip.plannedDistance / 62); // rough average speed calculation

                  return (
                    <div
                      key={trip.id}
                      className={`border bg-white p-5 rounded-2xl transition-all shadow-sm ${trip.status === 'Dispatched' ? 'border-blue-200 hover:border-blue-400' :
                          trip.status === 'Completed' ? 'border-gray-200 bg-gray-50/30' :
                            'border-red-150'
                        }`}
                    >
                      {/* Card Header details */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono font-bold text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 border dark:border-slate-750 px-2.5 py-0.5 rounded-lg text-xs">
                          {trip.id.length > 8 ? `TR-${trip.id.slice(0, 5).toUpperCase()}` : trip.id}
                        </span>

                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${trip.status === 'Dispatched' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-850/30' : trip.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-850/30' : trip.status === 'Cancelled' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-850/30' : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border border-gray-200 dark:border-slate-750'
                            }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${trip.status === 'Dispatched' ? 'bg-blue-500 animate-pulse' :
                                trip.status === 'Completed' ? 'bg-emerald-500' :
                                  trip.status === 'Cancelled' ? 'bg-rose-500' :
                                    'bg-gray-400'
                              }`}></span>
                            {trip.status}
                          </span>

                          {(trip.status === 'Completed' || trip.status === 'Cancelled') && !isReadOnly && (
                            <button
                              onClick={() => handleDeleteTrip(trip)}
                              className="h-6 w-6 rounded-md border border-gray-200 dark:border-slate-750 bg-white dark:bg-slate-850 flex items-center justify-center text-red-500 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-955/20 transition-colors shadow-xs cursor-pointer ml-1"
                              title="Delete Trip Record"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Route Map Section */}
                      <div className="mt-3.5 flex items-center gap-3 text-sm text-gray-800 dark:text-slate-200">
                        <span className="font-semibold">{trip.source}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400 dark:text-slate-550 shrink-0" />
                        <span className="font-semibold">{trip.destination}</span>
                      </div>

                      {/* Resource details */}
                      <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-sans text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800 pt-3">
                        <div>
                          <span className="block font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono text-[9px]">Vehicle allocated</span>
                          <span className="block mt-0.5 text-gray-700 dark:text-slate-300 font-mono">{trip.vehicleId || 'Awaiting Vehicle'}</span>
                          {vehicleObj && (
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">({vehicleObj.name})</span>
                          )}
                        </div>
                        <div>
                          <span className="block font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider font-mono text-[9px]">Driver assigned</span>
                          <span className="block mt-0.5 text-gray-700 dark:text-slate-300">{driverObj ? driverObj.name : 'Awaiting Driver'}</span>
                          {driverObj && (
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">Score: {driverObj.safetyScore}/100</span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer notes / ETA */}
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3 text-[11px] font-mono text-gray-400 dark:text-slate-555">
                        <span>Cargo Weight: <strong className="text-gray-600 dark:text-slate-350">{trip.cargoWeight.toLocaleString()} kg</strong></span>
                        <span>Distance: <strong className="text-gray-600 dark:text-slate-350">{trip.plannedDistance.toLocaleString()} km</strong></span>
                      </div>

                      {/* Note / ETA block */}
                      <div className="mt-3 text-xs bg-gray-50 dark:bg-slate-850/30 border dark:border-slate-800 p-2.5 rounded-xl font-mono text-gray-600 dark:text-slate-350 flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-gray-400 dark:text-slate-555 shrink-0" />
                        {trip.status === 'Dispatched' && (
                          <span>Status: In Transit (ETA: ~{etaHours} hrs remaining)</span>
                        )}
                        {trip.status === 'Completed' && (
                          <span>Status: Delivered (Fuel Consumed: {trip.fuelConsumed}L · Final Odo: {trip.finalOdometer.toLocaleString()} km)</span>
                        )}
                        {trip.status === 'Cancelled' && (
                          <span>Status: Cancelled compliance abort</span>
                        )}
                      </div>

                      {/* Dispatched Actions */}
                      {trip.status === 'Dispatched' && completingTripId !== trip.id && !isReadOnly && (
                        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-slate-800 pt-3 font-sans">
                          <button
                            onClick={() => handleCancelTrip(trip)}
                            className="flex-1 py-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl hover:bg-rose-50/50 dark:hover:bg-rose-955/10 hover:border-rose-300 transition-colors cursor-pointer text-center"
                          >
                            Cancel Dispatch
                          </button>

                          <button
                            onClick={() => handleOpenCompleteInline(trip)}
                            className="flex-1 py-2 bg-emerald-500 border border-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 shadow-sm transition-colors cursor-pointer text-center"
                          >
                            Complete Trip
                          </button>
                        </div>
                      )}

                      {/* Inline Completion Form */}
                      {completingTripId === trip.id && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-750 rounded-xl space-y-3 font-sans animate-slide-in">
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-750 pb-1.5 mb-1">
                            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider font-mono">Complete Trip Parameters</h4>
                            <span className="text-[10px] text-emerald-600 font-mono font-semibold uppercase">Trip Allocation release</span>
                          </div>

                          {inlineError && (
                            <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50/60 dark:bg-red-955/20 p-2.5 text-[10px] text-red-800 dark:text-red-400 flex items-start gap-1.5 animate-shake">
                              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                              <p className="font-semibold">{inlineError}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider font-mono mb-1">Final Odometer (km)</label>
                              <div className="relative">
                                <Gauge className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                  type="number"
                                  required
                                  value={finalOdometer}
                                  onChange={(e) => setFinalOdometer(e.target.value)}
                                  placeholder={`Min: ${vehicleObj ? vehicleObj.odometer : 0}`}
                                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-amber-500 font-mono"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-1">Fuel Consumed (L)</label>
                              <div className="relative">
                                <Droplet className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                  type="number"
                                  required
                                  value={fuelConsumed}
                                  onChange={(e) => setFuelConsumed(e.target.value)}
                                  placeholder="e.g. 150"
                                  className="w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-amber-500 font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-slate-750 mt-2">
                            <button
                              type="button"
                              onClick={() => setCompletingTripId(null)}
                              className="px-3 py-1.5 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-350 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>

                            <button
                              onClick={() => handleSaveCompletion(trip)}
                              disabled={isCompleting}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 shadow-sm transition-colors cursor-pointer disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                            >
                              {isCompleting ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Completing...</span>
                                </>
                              ) : (
                                <span>Save Completion</span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend row caption text below Live Board */}
            <div className="flex items-start gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-3 rounded-2xl text-[11px] font-mono text-gray-400 dark:text-slate-500">
              <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
              <span>
                <strong className="dark:text-slate-350">System Logic Map:</strong> On Complete: odometer → fuel log → expenses → Vehicle & Driver Available
              </span>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
