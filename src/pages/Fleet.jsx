import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  getDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { RBAC_MATRIX } from '../constants/rbac';
import { 
  Plus, 
  Search, 
  X, 
  Loader2, 
  AlertCircle, 
  Truck,
  Paperclip,
  Download,
  Trash2,
  UploadCloud,
  FileText
} from 'lucide-react';

// Default mock vehicles if none exist in localStorage
const defaultMockVehicles = [
  { regNo: 'NY-4921-TR', name: 'Titan Hauler 1', model: 'Volvo VNL 860', type: 'Truck', capacity: 36000, odometer: 142500, acqCost: 125000, status: 'On Trip' },
  { regNo: 'CA-8891-BX', name: 'Metro Cargo 3', model: 'Isuzu NPR-HD', type: 'Van', capacity: 6500, odometer: 89200, acqCost: 45000, status: 'Available' },
  { regNo: 'TX-5201-FB', name: 'Heavy Carrier 7', model: 'Peterbilt 579', type: 'Truck', capacity: 40000, odometer: 210400, acqCost: 140000, status: 'In Shop' }
];

export default function Fleet() {
  const { isMock, role } = useAuth();
  const permissions = RBAC_MATRIX[role] || {};
  const isReadOnly = permissions['/fleet'] === 'view';

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null); // null means we are adding

  // Form Field States
  const [regNo, setRegNo] = useState('');
  const [nameModel, setNameModel] = useState('');
  const [type, setType] = useState('Van');
  const [capacity, setCapacity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [acqCost, setAcqCost] = useState('');
  const [status, setStatus] = useState('Available');

  // Inline Validation States
  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Refs for magnetic hover effect
  const btnRef = useRef(null);

  // 1. Data synchronization
  useEffect(() => {
    if (isMock) {
      // Mock Storage Mode
      const loadMockData = () => {
        try {
          const stored = localStorage.getItem('mock_vehicles');
          if (stored) {
            setVehicles(JSON.parse(stored));
          } else {
            localStorage.setItem('mock_vehicles', JSON.stringify(defaultMockVehicles));
            setVehicles(defaultMockVehicles);
          }
          setLoading(false);
        } catch {
          setError('Failed to load mock fleet data.');
          setLoading(false);
        }
      };

      loadMockData();

      // Custom tab sync listener
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
      
      const unsubscribe = onSnapshot(vehiclesCol, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ regNo: doc.id, ...doc.data() });
        });
        // Sort by registration number client-side
        list.sort((a, b) => a.regNo.localeCompare(b.regNo));
        setVehicles(list);
        setLoading(false);
      }, (err) => {
        console.error('Firestore subscription error:', err);
        setError('Connected backend authorization or connectivity issue.');
        setLoading(false);
      });

      return unsubscribe;
    }
  }, [isMock]);

  // Helper to trigger real-time updates in Mock Mode
  const triggerMockUpdate = (newData) => {
    localStorage.setItem('mock_vehicles', JSON.stringify(newData));
    window.dispatchEvent(new Event('mock-vehicles-updated'));
  };

  // 2. Add / Edit Handlers
  const handleOpenAddDrawer = () => {
    setEditingVehicle(null);
    setRegNo('');
    setNameModel('');
    setType('Van');
    setCapacity('');
    setOdometer('');
    setAcqCost('');
    setStatus('Available');
    setValidationError('');
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (vehicle) => {
    setEditingVehicle(vehicle);
    setRegNo(vehicle.regNo);
    setNameModel(vehicle.name || vehicle.model || '');
    setType(vehicle.type || 'Van');
    setCapacity(vehicle.capacity || '');
    setOdometer(vehicle.odometer || '');
    setAcqCost(vehicle.acqCost || '');
    setStatus(vehicle.status || 'Available');
    setValidationError('');
    setIsDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    // Normalize Registration Number
    const cleanRegNo = regNo.trim().toUpperCase();
    if (!cleanRegNo) {
      setValidationError('Registration Number is required.');
      return;
    }

    if (!nameModel.trim()) {
      setValidationError('Name/Model is required.');
      return;
    }

    const numCapacity = parseFloat(capacity);
    const numOdometer = parseFloat(odometer);
    const numAcqCost = parseFloat(acqCost);

    if (isNaN(numCapacity) || numCapacity <= 0) {
      setValidationError('Max Load Capacity must be a positive number.');
      return;
    }
    if (isNaN(numOdometer) || numOdometer < 0) {
      setValidationError('Odometer reading cannot be negative.');
      return;
    }
    if (isNaN(numAcqCost) || numAcqCost < 0) {
      setValidationError('Acquisition Cost cannot be negative.');
      return;
    }

    setIsSaving(true);

    try {
      if (!editingVehicle) {
        // --- ADDING NEW VEHICLE ---
        // Validate Uniqueness
        if (isMock) {
          const exists = vehicles.some(
            (v) => v.regNo.trim().toUpperCase() === cleanRegNo
          );
          if (exists) {
            setValidationError('Registration number already exists');
            setIsSaving(false);
            return;
          }

          const newVehicle = {
            regNo: cleanRegNo,
            name: nameModel.trim(),
            model: nameModel.trim(), // sync name & model
            type,
            capacity: numCapacity,
            odometer: numOdometer,
            acqCost: numAcqCost,
            status
          };

          const updatedVehicles = [...vehicles, newVehicle];
          updatedVehicles.sort((a, b) => a.regNo.localeCompare(b.regNo));
          triggerMockUpdate(updatedVehicles);
        } else {
          // Real Firestore Unique Check
          const docRef = doc(db, 'vehicles', cleanRegNo);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setValidationError('Registration number already exists');
            setIsSaving(false);
            return;
          }

          // Document ID is regNo
          await setDoc(docRef, {
            name: nameModel.trim(),
            model: nameModel.trim(),
            type,
            capacity: numCapacity,
            odometer: numOdometer,
            acqCost: numAcqCost,
            status
          });
        }
      } else {
        // --- EDITING EXISTING VEHICLE ---
        if (isMock) {
          const updatedVehicles = vehicles.map((v) => {
            if (v.regNo === editingVehicle.regNo) {
              return {
                ...v,
                name: nameModel.trim(),
                model: nameModel.trim(),
                type,
                capacity: numCapacity,
                odometer: numOdometer,
                acqCost: numAcqCost,
                status
              };
            }
            return v;
          });
          triggerMockUpdate(updatedVehicles);
        } else {
          // Real Firestore Update
          const docRef = doc(db, 'vehicles', editingVehicle.regNo);
          await updateDoc(docRef, {
            name: nameModel.trim(),
            model: nameModel.trim(),
            type,
            capacity: numCapacity,
            odometer: numOdometer,
            acqCost: numAcqCost,
            status
          });
        }
      }

      // Close drawer and reset states
      setIsDrawerOpen(false);
    } catch (err) {
      console.error('Error saving vehicle:', err);
      setValidationError('An error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Document Upload and Management Handlers
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const handleUploadDocument = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingDoc(true);
    setValidationError('');

    try {
      let docUrl = '';
      const uploadedAt = new Date().toISOString();

      if (isMock) {
        // Mock Mode: Convert file to Base64 data URL
        const reader = new FileReader();
        docUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        const newDoc = {
          name: file.name,
          url: docUrl,
          uploadedAt
        };

        // Update local storage mock vehicles list
        const storedVehicles = localStorage.getItem('mock_vehicles');
        if (storedVehicles) {
          const list = JSON.parse(storedVehicles);
          const updated = list.map((v) => {
            if (v.regNo === editingVehicle.regNo) {
              const currentDocs = v.documents || [];
              return { ...v, documents: [...currentDocs, newDoc] };
            }
            return v;
          });
          localStorage.setItem('mock_vehicles', JSON.stringify(updated));
          // Update local state and trigger sync
          const match = updated.find((v) => v.regNo === editingVehicle.regNo);
          setEditingVehicle(match);
          window.dispatchEvent(new Event('mock-vehicles-updated'));
        }
      } else {
        // Firebase Production Mode
        const storageRef = ref(storage, `vehicles/${editingVehicle.regNo}/documents/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        docUrl = await getDownloadURL(snapshot.ref);

        const newDoc = {
          name: file.name,
          url: docUrl,
          uploadedAt
        };

        // Update Firestore doc metadata array
        const vehicleRef = doc(db, 'vehicles', editingVehicle.regNo);
        const currentDocs = editingVehicle.documents || [];
        const updatedDocs = [...currentDocs, newDoc];
        await updateDoc(vehicleRef, {
          documents: updatedDocs
        });
        
        // Update local state in drawer
        setEditingVehicle({
          ...editingVehicle,
          documents: updatedDocs
        });
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setValidationError('Failed to upload document. Please try again.');
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docToDelete) => {
    if (!window.confirm(`Are you sure you want to delete "${docToDelete.name}"?`)) return;

    setValidationError('');
    try {
      if (isMock) {
        // Mock Mode: Delete from local storage
        const storedVehicles = localStorage.getItem('mock_vehicles');
        if (storedVehicles) {
          const list = JSON.parse(storedVehicles);
          const updated = list.map((v) => {
            if (v.regNo === editingVehicle.regNo) {
              const currentDocs = v.documents || [];
              return { 
                ...v, 
                documents: currentDocs.filter((d) => d.name !== docToDelete.name || d.uploadedAt !== docToDelete.uploadedAt) 
              };
            }
            return v;
          });
          localStorage.setItem('mock_vehicles', JSON.stringify(updated));
          const match = updated.find((v) => v.regNo === editingVehicle.regNo);
          setEditingVehicle(match);
          window.dispatchEvent(new Event('mock-vehicles-updated'));
        }
      } else {
        // Firebase Production Mode
        try {
          const storageRef = ref(storage, `vehicles/${editingVehicle.regNo}/documents/${docToDelete.name}`);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('Storage file deletion skipped or failed:', storageErr);
        }

        // Delete metadata array from Firestore
        const vehicleRef = doc(db, 'vehicles', editingVehicle.regNo);
        const currentDocs = editingVehicle.documents || [];
        const updatedDocs = currentDocs.filter(
          (d) => d.name !== docToDelete.name || d.uploadedAt !== docToDelete.uploadedAt
        );
        await updateDoc(vehicleRef, {
          documents: updatedDocs
        });

        // Update local drawer state
        setEditingVehicle({
          ...editingVehicle,
          documents: updatedDocs
        });
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setValidationError('Failed to delete document. Please try again.');
    }
  };

  // 3. Magnetic Hover Effect Utility
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

  // 4. Filtering Logic (Client side)
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = v.regNo.toLowerCase().includes(searchTerm.toLowerCase().trim());
    const matchesType = filterType === 'All' || v.type === filterType;
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 relative h-full">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Vehicle Registry</h2>
          <p className="text-sm text-gray-500 mt-1">Configure active fleet parameters, load weight caps, and lifecycle statuses.</p>
        </div>
        
        {/* Amber Add Vehicle Button (Magnetic Hover) */}
        {!isReadOnly && (
          <button
            ref={btnRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleOpenAddDrawer}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-gray-900 shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-300 ease-out cursor-pointer select-none shrink-0"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
            <span>Add Vehicle</span>
          </button>
        )}
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

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/60 p-4 rounded-2xl border border-gray-150">
        {/* Search input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by Reg. No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-sans"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500 font-mono uppercase tracking-wider">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
          >
            <option value="All">All Types</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Mini">Mini</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500 font-mono uppercase tracking-wider">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
          <p className="text-sm font-semibold tracking-wider text-gray-400 font-mono uppercase">Querying Vehicle Registries...</p>
        </div>
      ) : filteredVehicles.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm text-center px-4">
          <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4 animate-pulse">
            <Truck className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1 font-sans">No vehicles registered yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            {searchTerm || filterType !== 'All' || filterStatus !== 'All' 
              ? 'No registered vehicles match your current search and filter parameters.' 
              : 'Add your first box truck, cargo van, or mini transport vehicle to get started.'}
          </p>
          {(searchTerm || filterType !== 'All' || filterStatus !== 'All') ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterType('All');
                setFilterStatus('All');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          ) : !isReadOnly ? (
            <button
              onClick={handleOpenAddDrawer}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-gray-900 shadow-sm hover:bg-amber-600 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Vehicle</span>
            </button>
          ) : null}
        </div>
      ) : (
        /* Data Table */
        <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white shadow-sm transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Reg. No</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Name/Model</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Type</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Capacity</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Odometer</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Acq. Cost</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm font-sans">
                {filteredVehicles.map((v) => (
                  <tr 
                    key={v.regNo} 
                    onClick={() => !isReadOnly && handleOpenEditDrawer(v)}
                    className={`hover:bg-amber-50/10 transition-colors duration-150 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {/* Reg No in bold JetBrains Mono */}
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{v.regNo}</span>
                        {v.documents && v.documents.length > 0 && (
                          <span 
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            title={`${v.documents.length} document(s) uploaded`}
                          >
                            <Paperclip className="h-3 w-3 shrink-0" />
                            <span>{v.documents.length}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Name / Model display */}
                    <td className="px-6 py-4 text-gray-800 whitespace-nowrap">
                      <span className="font-semibold block">{v.name}</span>
                      {v.model && v.model !== v.name && (
                        <span className="text-xs text-gray-400 block font-mono mt-0.5">{v.model}</span>
                      )}
                    </td>
                    
                    {/* Type */}
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{v.type}</td>
                    
                    {/* Capacity in JetBrains Mono */}
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap font-mono">{v.capacity.toLocaleString()} kg</td>
                    
                    {/* Odometer in JetBrains Mono */}
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap font-mono">{v.odometer.toLocaleString()} km</td>
                    
                    {/* Acquisition Cost in JetBrains Mono */}
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap font-mono">
                      ${v.acqCost.toLocaleString()}
                    </td>
                    
                    {/* Status Pill Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        v.status === 'Available' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        v.status === 'On Trip' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        v.status === 'In Shop' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          v.status === 'Available' ? 'bg-emerald-500' :
                          v.status === 'On Trip' ? 'bg-blue-500' :
                          v.status === 'In Shop' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}></span>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Red-accented Rule Note below the table */}
      <div className="flex items-start gap-2.5 rounded-xl bg-red-50/40 border border-red-100 p-3 text-xs text-red-700">
        <span className="inline-flex h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1.5"></span>
        <span>
          <strong className="font-bold">Rule:</strong> Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher
        </span>
      </div>

      {/* Sliding Sidebar Drawer/Panel for Add & Edit */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Overlay backdrop */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity duration-300"
          ></div>

          {/* Drawer container */}
          <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full z-10 animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-150">
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">
                  {editingVehicle ? 'Edit Vehicle' : 'Register Vehicle'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  {editingVehicle ? `ID: ${editingVehicle.regNo}` : 'Create a new fleet record'}
                </p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="h-8 w-8 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Notification */}
            {validationError && (
              <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs text-red-800 flex items-start gap-2 animate-shake">
                <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <p className="font-bold">{validationError}</p>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Registration Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Registration Number
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingVehicle}
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. NY-1234-AB"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed uppercase"
                />
                {!editingVehicle && (
                  <p className="text-[10px] text-gray-400 mt-1">Must be unique. Format: [State]-[Numbers]-[Letters].</p>
                )}
              </div>

              {/* Name/Model */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Name / Model
                </label>
                <input
                  type="text"
                  required
                  value={nameModel}
                  onChange={(e) => setNameModel(e.target.value)}
                  placeholder="e.g. Titan Hauler 1"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              {/* Type dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Vehicle Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                >
                  <option value="Van">Van</option>
                  <option value="Truck">Truck</option>
                  <option value="Mini">Mini</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Max Load Capacity */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Max Load Capacity (kg)
                </label>
                <input
                  type="number"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 36000"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                />
              </div>

              {/* Odometer */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Odometer (km)
                </label>
                <input
                  type="number"
                  required
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="e.g. 142500"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                />
              </div>

              {/* Acquisition Cost */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Acquisition Cost ($)
                </label>
                <input
                  type="number"
                  required
                  value={acqCost}
                  onChange={(e) => setAcqCost(e.target.value)}
                  placeholder="e.g. 125000"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Operational Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="In Shop">In Shop</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              {/* Documents Section (Only if editing/viewing an existing vehicle) */}
              {editingVehicle && (
                <div className="pt-5 border-t border-gray-150 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900 font-sans">Vehicle Documents</h4>
                    <span className="text-[10px] text-gray-400 font-mono">PDF, PNG, JPG</span>
                  </div>

                  {/* Document Upload Area */}
                  <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center text-center space-y-2 relative">
                    {isUploadingDoc ? (
                      <div className="flex flex-col items-center gap-1.5 py-2">
                        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                        <span className="text-xs font-semibold text-gray-500 font-mono">Uploading to storage...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="h-6 w-6 text-gray-400" />
                        <div className="text-xs text-gray-600">
                          <label htmlFor="doc-upload" className="cursor-pointer font-semibold text-amber-600 hover:text-amber-700 underline">
                            Upload a file
                          </label>
                          <span className="text-gray-400"> or drag and drop</span>
                        </div>
                        <input
                          id="doc-upload"
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleUploadDocument}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>

                  {/* Document List */}
                  {(!editingVehicle.documents || editingVehicle.documents.length === 0) ? (
                    <p className="text-xs text-gray-450 italic text-center py-2">No documents attached to this vehicle yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-xs">
                      {editingVehicle.documents.map((doc, idx) => (
                        <li key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-800 truncate" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            <a
                              href={doc.url}
                              download={doc.name}
                              target="_blank"
                              rel="noreferrer"
                              className="h-7 w-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-amber-600 hover:bg-amber-50/30 transition-colors cursor-pointer"
                              title="Download / View"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc)}
                              className="h-7 w-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-150 bg-gray-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-gray-900 border border-transparent shadow-sm hover:bg-amber-600 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Drawer Transition Styles */}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
}
