import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { RBAC_MATRIX } from '../constants/rbac';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Minus,
  Save,
  Lock,
  Info
} from 'lucide-react';

const MODULE_NAMES = {
  '/fleet': 'Fleet',
  '/drivers': 'Drivers',
  '/dispatch': 'Trips',
  '/maintenance': 'Maint.',
  '/fuel-expenses': 'Fuel/Exp.',
  '/analytics': 'Analytics'
};

const ROLE_NAMES = {
  FleetManager: 'Fleet Manager',
  Dispatcher: 'Dispatcher',
  SafetyOfficer: 'Safety Officer',
  FinancialAnalyst: 'Financial Analyst'
};

export default function Settings() {
  const { isMock, resetFailedAttempts } = useAuth();
  
  // Settings States
  const [depotName, setDepotName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [distanceUnit, setDistanceUnit] = useState('Kilometers');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Magnetic hover ref
  const btnRef = useRef(null);

  // 1. Data synchronization
  useEffect(() => {
    if (isMock) {
      // Mock Storage Mode settings sync
      const loadMockData = () => {
        try {
          const stored = localStorage.getItem('mock_general_settings');
          if (stored) {
            const data = JSON.parse(stored);
            setDepotName(data.depotName || 'Gandhinagar Central Depot');
            setCurrency(data.currency || 'INR');
            setDistanceUnit(data.distanceUnit || 'Kilometers');
          } else {
            const defaults = {
              depotName: 'Gandhinagar Central Depot',
              currency: 'INR',
              distanceUnit: 'Kilometers'
            };
            localStorage.setItem('mock_general_settings', JSON.stringify(defaults));
            setDepotName(defaults.depotName);
            setCurrency(defaults.currency);
            setDistanceUnit(defaults.distanceUnit);
          }
          setLoading(false);
        } catch {
          setError('Failed to load mock system settings.');
          setLoading(false);
        }
      };

      loadMockData();

      // Custom window updates trigger
      const handleStorageUpdate = (e) => {
        if (e.key === 'mock_general_settings' || e.type === 'mock-settings-updated') {
          loadMockData();
        }
      };

      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('mock-settings-updated', handleStorageUpdate);

      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('mock-settings-updated', handleStorageUpdate);
      };
    } else {
      // Real Firebase Firestore Mode settings
      setLoading(true);
      const settingsDocRef = doc(db, 'settings', 'general');

      const unsubscribe = onSnapshot(settingsDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setDepotName(data.depotName || 'Gandhinagar Central Depot');
          setCurrency(data.currency || 'INR');
          setDistanceUnit(data.distanceUnit || 'Kilometers');
        } else {
          // If Firestore settings doc doesn't exist, create it with defaults
          const defaults = {
            depotName: 'Gandhinagar Central Depot',
            currency: 'INR',
            distanceUnit: 'Kilometers'
          };
          setDoc(settingsDocRef, defaults);
          setDepotName(defaults.depotName);
          setCurrency(defaults.currency);
          setDistanceUnit(defaults.distanceUnit);
        }
        setLoading(false);
      }, (err) => {
        console.error('Firestore subscription error:', err);
        setError('Connected backend configuration or network error.');
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [isMock]);

  // Save changes handler
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');

    const updatedData = {
      depotName: depotName.trim(),
      currency,
      distanceUnit
    };

    try {
      if (isMock) {
        localStorage.setItem('mock_general_settings', JSON.stringify(updatedData));
        window.dispatchEvent(new Event('mock-settings-updated'));
      } else {
        await setDoc(doc(db, 'settings', 'general'), updatedData);
      }
      setSuccessMessage('General settings updated successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
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
      
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-sans">Settings & RBAC</h2>
        <p className="text-sm text-gray-500 mt-1">Configure general system behaviors and view role authorizations.</p>
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
          <p className="text-sm font-semibold tracking-wider text-gray-400 font-mono uppercase">Syncing Configuration Hub...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN - General Settings Form */}
          <section className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900 font-sans">General Configurations</h3>
              <p className="text-xs text-gray-400 mt-1 font-mono">Workspace: Depot Operational Defaults</p>
            </div>

            {successMessage && (
              <div className="rounded-xl border border-emerald-250 bg-emerald-50/50 p-3 text-xs text-emerald-800 flex items-start gap-2 animate-slide-in">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                <p className="font-bold">{successMessage}</p>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              
              {/* Depot Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Depot Name</label>
                <input
                  type="text"
                  required
                  value={depotName}
                  onChange={(e) => setDepotName(e.target.value)}
                  placeholder="e.g. Gandhinagar Depot"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                </select>
              </div>

              {/* Distance Unit Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 font-mono mb-1.5">Distance Unit</label>
                <select
                  value={distanceUnit}
                  onChange={(e) => setDistanceUnit(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                >
                  <option value="Kilometers">Kilometers (km)</option>
                  <option value="Miles">Miles (mi)</option>
                </select>
              </div>

              {/* Save changes button */}
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
                    <span>Saving configurations...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4.5 w-4.5 stroke-[2.2]" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>

            </form>

            {/* Simulated Locker Settings Reset (Cleared Failed Logins) */}
            <div className="pt-5 border-t border-gray-150 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-800 font-sans">Simulated Security Settings</h4>
                <p className="text-xs text-gray-400 mt-1 font-sans">Manage authorization simulations and safety thresholds.</p>
              </div>
              <button
                onClick={() => {
                  resetFailedAttempts();
                  alert("Simulation lockout attempts cleared successfully!");
                }}
                className="w-full py-2.5 text-xs border border-gray-300 rounded-xl font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all cursor-pointer font-sans"
              >
                Reset Failed Login Simulation Lockouts
              </button>
            </div>

          </section>

          {/* RIGHT COLUMN - RBAC Matrix Table */}
          <section className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">Role-Based Access (RBAC) Matrix</h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">Reference panel for route authorizations and actions control</p>
              </div>
              <Shield className="h-5 w-5 text-amber-500" />
            </div>

            {/* Matrix Table */}
            <div className="overflow-hidden border border-gray-200 rounded-xl bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3.5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">Role</th>
                      {Object.keys(MODULE_NAMES).map((path) => (
                        <th 
                          key={path} 
                          scope="col" 
                          className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono"
                        >
                          {MODULE_NAMES[path]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs font-sans">
                    {Object.keys(ROLE_NAMES).map((roleKey) => (
                      <tr key={roleKey} className="hover:bg-amber-50/5 transition-colors duration-150">
                        <td className="px-3.5 py-3.5 whitespace-nowrap font-bold text-gray-900">
                          {ROLE_NAMES[roleKey]}
                        </td>
                        
                        {Object.keys(MODULE_NAMES).map((path) => {
                          const level = RBAC_MATRIX[roleKey]?.[path] || '—';
                          
                          // Style cells based on access level
                          let badgeStyles = 'text-gray-400 bg-gray-50/50';
                          let icon = <Minus className="h-3 w-3" />;
                          
                          if (level === '✓') {
                            badgeStyles = 'text-emerald-700 bg-emerald-50 border border-emerald-100 font-bold';
                            icon = <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />;
                          } else if (level === 'view') {
                            badgeStyles = 'text-amber-700 bg-amber-50 border border-amber-100 font-medium';
                            icon = <Eye className="h-3.5 w-3.5 text-amber-600" />;
                          } else if (level === '—') {
                            badgeStyles = 'text-gray-400 bg-gray-50/40 border border-gray-100';
                            icon = <Lock className="h-3 w-3 text-gray-400" />;
                          }

                          return (
                            <td key={path} className="px-2 py-3.5 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wide font-mono ${badgeStyles}`}>
                                {icon}
                                {level}
                              </span>
                            </td>
                          );
                        })}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Helper description text */}
            <div className="flex gap-2.5 items-start bg-amber-50/30 border border-amber-150 p-4 rounded-xl text-xs text-amber-900 font-sans leading-relaxed">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Matrix Key Details:</p>
                <ul className="list-disc pl-4 mt-1.5 space-y-1.5 text-amber-800">
                  <li>
                    <strong className="font-mono text-emerald-700 font-bold">✓ (Full Access)</strong>: Full operational authorization. Users can view registers, submit forms, log services, complete trips, and delete logs.
                  </li>
                  <li>
                    <strong className="font-mono text-amber-700 font-bold">view (View Only)</strong>: Read-only reference panel access. Users can navigate to the page and search the data, but save buttons and trigger actions are fully disabled.
                  </li>
                  <li>
                    <strong className="font-mono text-gray-600 font-bold">— (Restricted)</strong>: Complete lockout. Clicking the link displays an "Access Denied" page, and form requests are blocked.
                  </li>
                </ul>
              </div>
            </div>

          </section>

        </div>
      )}
      
    </div>
  );
}
