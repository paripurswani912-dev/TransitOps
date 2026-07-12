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
  Plus, 
  Search, 
  X, 
  Loader2, 
  AlertCircle, 
  Users, 
  Award 
} from 'lucide-react';

// Default mock drivers if none exist in localStorage
const defaultMockDrivers = [
  { id: 'mock-driver-1', name: 'Marcus Vance', licenseNo: 'DL-99218-A', licenseCategory: 'HMV', licenseExpiry: '2028-11-14', contact: '+1 (555) 123-4567', safetyScore: 98, status: 'Available', tripCompletion: 95 },
  { id: 'mock-driver-2', name: 'Sarah Jenkins', licenseNo: 'DL-88214-B', licenseCategory: 'LMV', licenseExpiry: '2027-04-20', contact: '+1 (555) 987-6543', safetyScore: 94, status: 'On Trip', tripCompletion: 100 },
  { id: 'mock-driver-3', name: 'Robert Chen', licenseNo: 'DL-44109-A', licenseCategory: 'HMV', licenseExpiry: '2026-09-05', contact: '+1 (555) 456-7890', safetyScore: 89, status: 'Off Duty', tripCompletion: 88 },
  { id: 'mock-driver-4', name: 'Dave Miller', licenseNo: 'DL-22105-X', licenseCategory: 'MMV', licenseExpiry: '2025-03-10', contact: '+1 (555) 222-3333', safetyScore: 75, status: 'Suspended', tripCompletion: 60 }
];

export default function Drivers() {
  const { isMock } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');

  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null); // null means we are adding

  // Form Field States
  const [name, setName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('LMV');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [contact, setContact] = useState('');
  const [safetyScore, setSafetyScore] = useState('100');
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
          const stored = localStorage.getItem('mock_drivers');
          if (stored) {
            setDrivers(JSON.parse(stored));
          } else {
            localStorage.setItem('mock_drivers', JSON.stringify(defaultMockDrivers));
            setDrivers(defaultMockDrivers);
          }
          setLoading(false);
        } catch {
          setError('Failed to load mock drivers data.');
          setLoading(false);
        }
      };

      loadMockData();

      // Custom tab sync listener
      const handleStorageUpdate = (e) => {
        if (e.key === 'mock_drivers' || e.type === 'mock-drivers-updated') {
          loadMockData();
        }
      };

      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('mock-drivers-updated', handleStorageUpdate);
      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('mock-drivers-updated', handleStorageUpdate);
      };
    } else {
      // Real Firebase Firestore Mode
      setLoading(true);
      const driversCol = collection(db, 'drivers');
      
      const unsubscribe = onSnapshot(driversCol, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        // Sort by name client-side
        list.sort((a, b) => a.name.localeCompare(b.name));
        setDrivers(list);
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
    localStorage.setItem('mock_drivers', JSON.stringify(newData));
    window.dispatchEvent(new Event('mock-drivers-updated'));
  };

  // Helper to check if license is expired
  const isLicenseExpired = (expiryDateStr) => {
    if (!expiryDateStr) return false;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    // Set times to midnight to only compare dates
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  // Helper to format expiry date for displaying as MM/YYYY
  const renderExpiry = (expiryDateStr) => {
    if (!expiryDateStr) return '-';
    const isExpired = isLicenseExpired(expiryDateStr);
    
    let formatted = expiryDateStr;
    const parts = expiryDateStr.split('-');
    if (parts.length === 3) {
      formatted = `${parts[1]}/${parts[0]}`; // MM/YYYY format
    }

    if (isExpired) {
      return (
        <span className="text-rose-600 font-bold font-mono inline-flex items-center gap-1.5">
          <span>{formatted}</span>
          <span className="bg-rose-50 border border-rose-200 text-rose-800 text-[9px] px-1.5 py-0.5 rounded-md font-sans uppercase font-bold tracking-wider animate-pulse">
            EXPIRED
          </span>
        </span>
      );
    }
    return <span className="font-mono text-gray-700">{formatted}</span>;
  };

  // 2. Add / Edit Handlers
  const handleOpenAddDrawer = () => {
    setEditingDriver(null);
    setName('');
    setLicenseNo('');
    setLicenseCategory('LMV');
    setLicenseExpiry('');
    setContact('');
    setSafetyScore('100');
    setStatus('Available');
    setValidationError('');
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (driver) => {
    setEditingDriver(driver);
    setName(driver.name || '');
    setLicenseNo(driver.licenseNo || '');
    setLicenseCategory(driver.licenseCategory || 'LMV');
    setLicenseExpiry(driver.licenseExpiry || '');
    setContact(driver.contact || '');
    setSafetyScore(driver.safetyScore !== undefined ? String(driver.safetyScore) : '100');
    setStatus(driver.status || 'Available');
    setValidationError('');
    setIsDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    // Normalization & Validation
    if (!name.trim()) {
      setValidationError('Name is required.');
      return;
    }
    if (!licenseNo.trim()) {
      setValidationError('License Number is required.');
      return;
    }
    if (!licenseExpiry) {
      setValidationError('License Expiry Date is required.');
      return;
    }
    if (!contact.trim()) {
      setValidationError('Contact Number is required.');
      return;
    }

    const numSafety = parseInt(safetyScore, 10);
    if (isNaN(numSafety) || numSafety < 0 || numSafety > 100) {
      setValidationError('Safety Score must be a number between 0 and 100.');
      return;
    }

    setIsSaving(true);

    try {
      if (!editingDriver) {
        // --- ADDING NEW DRIVER ---
        if (isMock) {
          const newDriver = {
            id: 'mock-driver-' + Math.random().toString(36).substring(2, 9),
            name: name.trim(),
            licenseNo: licenseNo.trim().toUpperCase(),
            licenseCategory,
            licenseExpiry,
            contact: contact.trim(),
            safetyScore: numSafety,
            status,
            tripCompletion: 0 // default for new drivers
          };

          const updatedDrivers = [...drivers, newDriver];
          updatedDrivers.sort((a, b) => a.name.localeCompare(b.name));
          triggerMockUpdate(updatedDrivers);
        } else {
          // Real Firestore Create (Auto-generated Doc ID)
          const newDocRef = doc(collection(db, 'drivers'));
          await setDoc(newDocRef, {
            name: name.trim(),
            licenseNo: licenseNo.trim().toUpperCase(),
            licenseCategory,
            licenseExpiry,
            contact: contact.trim(),
            safetyScore: numSafety,
            status,
            tripCompletion: 0
          });
        }
      } else {
        // --- EDITING EXISTING DRIVER ---
        if (isMock) {
          const updatedDrivers = drivers.map((d) => {
            if (d.id === editingDriver.id) {
              return {
                ...d,
                name: name.trim(),
                licenseNo: licenseNo.trim().toUpperCase(),
                licenseCategory,
                licenseExpiry,
                contact: contact.trim(),
                safetyScore: numSafety,
                status
              };
            }
            return d;
          });
          triggerMockUpdate(updatedDrivers);
        } else {
          // Real Firestore Update
          const docRef = doc(db, 'drivers', editingDriver.id);
          await updateDoc(docRef, {
            name: name.trim(),
            licenseNo: licenseNo.trim().toUpperCase(),
            licenseCategory,
            licenseExpiry,
            contact: contact.trim(),
            safetyScore: numSafety,
            status
          });
        }
      }

      setIsDrawerOpen(false);
    } catch (err) {
      console.error('Error saving driver:', err);
      setValidationError('An error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
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
  const filteredDrivers = drivers.filter((d) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesName = d.name.toLowerCase().includes(term);
    const matchesLicense = d.licenseNo.toLowerCase().includes(term);
    return matchesName || matchesLicense;
  });

  return (
    <div className="space-y-6 relative h-full">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Drivers & Safety Profiles</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor licensing credentials, safety ratings, and active duty assignments.</p>
        </div>
        
        {/* Amber Add Driver Button */}
        <button
          ref={btnRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleOpenAddDrawer}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-gray-900 shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-300 ease-out cursor-pointer select-none shrink-0"
        >
          <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
          <span>Add Driver</span>
        </button>
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
      <div className="bg-gray-50/60 p-4 rounded-2xl border border-gray-150">
        {/* Search input */}
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name or license number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-sans"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-3" />
          <p className="text-sm font-semibold tracking-wider text-gray-400 font-mono uppercase">Querying Driver Registries...</p>
        </div>
      ) : filteredDrivers.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm text-center px-4">
          <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-4 animate-pulse">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1 font-sans">No drivers registered yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            {searchTerm 
              ? 'No registered drivers match your current search parameter.' 
              : 'Add your first pilot, long-haul operator, or dispatch driver to get started.'}
          </p>
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={handleOpenAddDrawer}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-gray-900 shadow-sm hover:bg-amber-600 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Add Driver</span>
            </button>
          )}
        </div>
      ) : (
        /* Data Table */
        <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white shadow-sm transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Driver</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">License No.</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Category</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Expiry</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Contact</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono text-center">Trip Compl.</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono text-center">Safety Score</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 font-mono">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm font-sans">
                {filteredDrivers.map((d) => (
                  <tr 
                    key={d.id} 
                    onClick={() => handleOpenEditDrawer(d)}
                    className="hover:bg-amber-50/10 cursor-pointer transition-colors duration-150"
                  >
                    {/* Driver Name in Bold */}
                    <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{d.name}</td>
                    
                    {/* License No in JetBrains Mono */}
                    <td className="px-6 py-4 font-mono font-medium text-gray-700 whitespace-nowrap">{d.licenseNo}</td>
                    
                    {/* Category */}
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{d.licenseCategory}</td>
                    
                    {/* Expiry (Formatted and styled if expired) */}
                    <td className="px-6 py-4 whitespace-nowrap">{renderExpiry(d.licenseExpiry)}</td>
                    
                    {/* Contact details */}
                    <td className="px-6 py-4 font-mono text-gray-600 whitespace-nowrap">{d.contact}</td>
                    
                    {/* Trip Completion percentage */}
                    <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-medium text-gray-700">
                      {d.tripCompletion !== undefined ? `${d.tripCompletion}%` : '0%'}
                    </td>
                    
                    {/* Safety score with colored pill */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-1 font-mono font-bold rounded-lg px-2.5 py-1 text-xs ${
                        d.safetyScore >= 95 ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' :
                        d.safetyScore >= 90 ? 'bg-amber-50 text-amber-800 border border-amber-150' :
                        'bg-rose-50 text-rose-800 border border-rose-150'
                      }`}>
                        <Award className={`h-3.5 w-3.5 ${
                          d.safetyScore >= 95 ? 'text-emerald-500' :
                          d.safetyScore >= 90 ? 'text-amber-500' :
                          'text-rose-500'
                        }`} />
                        <span>{d.safetyScore} / 100</span>
                      </span>
                    </td>
                    
                    {/* Status Pill Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        d.status === 'Available' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        d.status === 'On Trip' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        d.status === 'Off Duty' ? 'bg-gray-100 text-gray-600 border border-gray-250' :
                        'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          d.status === 'Available' ? 'bg-emerald-500' :
                          d.status === 'On Trip' ? 'bg-blue-500' :
                          d.status === 'Off Duty' ? 'bg-gray-400' :
                          'bg-rose-500'
                        }`}></span>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend Row of 4 status pills */}
      <div className="flex items-center space-x-4 bg-gray-50/50 border border-gray-200 rounded-xl p-3.5">
        <span className="text-xs font-semibold text-gray-500 font-mono uppercase tracking-wider">Status Key:</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-250">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Available
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-250">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>On Trip
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>Off Duty
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-250">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>Suspended
          </span>
        </div>
      </div>

      {/* Red-accented Rule Note below key legend */}
      <div className="flex items-start gap-2.5 rounded-xl bg-red-50/40 border border-red-100 p-3 text-xs text-red-700">
        <span className="inline-flex h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1.5"></span>
        <span>
          <strong className="font-bold">Rule:</strong> Expired license or Suspended status → blocked from trip assignment
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
                  {editingDriver ? 'Edit Driver Profile' : 'Register Driver'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  {editingDriver ? `ID: ${editingDriver.id}` : 'Create a new driver safety record'}
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
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 font-sans">
              {/* Driver Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Driver Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              {/* License Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  License Number
                </label>
                <input
                  type="text"
                  required
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  placeholder="e.g. DL-99218-A"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono uppercase"
                />
              </div>

              {/* License Category Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  License Category
                </label>
                <select
                  value={licenseCategory}
                  onChange={(e) => setLicenseCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                >
                  <option value="LMV">LMV (Light Motor Vehicle)</option>
                  <option value="MMV">MMV (Medium Motor Vehicle)</option>
                  <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                  <option value="Other">Other Category</option>
                </select>
              </div>

              {/* License Expiry Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  License Expiry Date
                </label>
                <input
                  type="date"
                  required
                  value={licenseExpiry}
                  onChange={(e) => setLicenseExpiry(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. +1 (555) 123-4567"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono"
                />
              </div>

              {/* Safety Score */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Safety Rating / Score
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={safetyScore}
                  onChange={(e) => setSafetyScore(e.target.value)}
                  placeholder="100"
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
                  <option value="Off Duty">Off Duty</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
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
                  <span>{editingDriver ? 'Update Driver' : 'Register Driver'}</span>
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
