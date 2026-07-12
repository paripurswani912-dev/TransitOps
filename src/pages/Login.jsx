import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Info, Key, Mail, User, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { signIn, signUp, isLocked, failedAttempts, resetFailedAttempts, isMock } = useAuth();
  const navigate = useNavigate();

  // Mode: 'signin' | 'signup'
  const [mode, setMode] = useState('signin');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // RBAC dropdown for demo/testing convenience
  // Real role will come from Firestore users collection
  const [demoRole, setDemoRole] = useState('Dispatcher');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isLocked) {
      setError("Invalid credentials — Account locked after 5 failed attempts");
      return;
    }

    if (!email || !password || (mode === 'signup' && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'signin') {
        // Sign in using AuthContext
        // We pass the demoRole as an override parameter to allow quick role testing
        await signIn(email, password, demoRole);
        navigate('/dashboard');
      } else {
        // Sign up (role defaults to 'Dispatcher' as per schema requirements)
        await signUp(email, password, name);
        setSuccessMessage("Account created successfully as 'Dispatcher'! Redirecting...");
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An authentication error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
    
    // Automatically match dropdown role to the clicked demo user
    if (demoEmail.startsWith('admin')) setDemoRole('FleetManager');
    else if (demoEmail.startsWith('dispatcher')) setDemoRole('Dispatcher');
    else if (demoEmail.startsWith('safety')) setDemoRole('SafetyOfficer');
    else if (demoEmail.startsWith('finance')) setDemoRole('FinancialAnalyst');
  };

  return (
    <div className="flex min-h-screen w-screen flex-col lg:flex-row bg-[#F9FAFB]">
      
      {/* LEFT PANEL - Dark Slate (40% width on large screens) */}
      <section className="flex flex-col justify-between bg-[#1F2937] p-8 text-white lg:w-[40%] xl:p-12">
        {/* Brand Logo Header */}
        <div className="flex items-center space-x-3">
          <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center font-bold text-gray-900 text-xs">T</div>
          <span className="text-2xl font-bold tracking-tight text-white">TransitOps</span>
        </div>

        {/* Mid Branding Content */}
        <div className="my-12 space-y-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Smart Transport Operations Platform
            </h1>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed font-sans">
              Centralized fleet diagnostics, dispatch automation, and compliance metrics for modern logistics networks.
            </p>
          </div>

          {/* RBAC List Section */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5 space-y-4">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-gray-400 font-mono">
              One login, four roles
            </h2>
            <ul className="space-y-2.5 text-sm font-medium font-sans">
              <li className="flex items-center">
                <span className="mr-2.5 h-2 w-2 rounded-full bg-amber-500"></span>
                Fleet Manager
              </li>
              <li className="flex items-center">
                <span className="mr-2.5 h-2 w-2 rounded-full bg-amber-500"></span>
                Dispatcher
              </li>
              <li className="flex items-center">
                <span className="mr-2.5 h-2 w-2 rounded-full bg-amber-500"></span>
                Safety Officer
              </li>
              <li className="flex items-center">
                <span className="mr-2.5 h-2 w-2 rounded-full bg-amber-500"></span>
                Financial Analyst
              </li>
            </ul>

            {/* Scoped access list */}
            <div className="border-t border-gray-800 pt-3.5 mt-3 space-y-1.5 text-xs text-gray-400 font-mono leading-relaxed">
              <div className="flex justify-between">
                <span>Fleet Manager</span>
                <span className="text-amber-500">→ Fleet, Maintenance</span>
              </div>
              <div className="flex justify-between">
                <span>Dispatcher</span>
                <span className="text-amber-500">→ Dashboard, Trips</span>
              </div>
              <div className="flex justify-between">
                <span>Safety Officer</span>
                <span className="text-amber-500">→ Drivers, Compliance</span>
              </div>
              <div className="flex justify-between">
                <span>Financial Analyst</span>
                <span className="text-amber-500">→ Fuel & Expenses, Analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Panel Footer / Legal */}
        <div className="text-[11px] text-gray-500 font-mono">
          SECURE VPN TUNNEL ACTIVE // TRANSITOPS CORP © 2026
        </div>
      </section>

      {/* RIGHT PANEL - White/Soft Background (60% width on large screens) */}
      <section className="flex flex-1 flex-col justify-center bg-white px-6 py-12 sm:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Header Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {mode === 'signin' ? 'Sign in to your account' : 'Create operational account'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {mode === 'signin' ? (
                <>
                  Or{' '}
                  <button 
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="font-medium text-amber-600 hover:text-amber-500 font-semibold"
                  >
                    request new account dispatch
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button 
                    onClick={() => { setMode('signin'); setError(null); }}
                    className="font-medium text-amber-600 hover:text-amber-500 font-semibold"
                  >
                    sign in here
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Failed Attempts Lockout Box / Custom Error State Callout */}
          {(isLocked || error) && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-800 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold">
                  {isLocked ? "Invalid credentials — Account locked after 5 failed attempts" : error}
                </p>
                {isLocked && (
                  <p className="text-xs text-red-600 leading-relaxed font-sans">
                    Your workstation has been locked out from operations for safety compliance. Contact a Safety Officer or reset failed attempts in the settings page or click below.
                  </p>
                )}
                {isLocked && (
                  <button
                    onClick={() => {
                      resetFailedAttempts();
                      setError(null);
                    }}
                    className="mt-2 text-xs font-mono font-bold text-red-800 hover:text-red-950 underline block"
                  >
                    [Developer Override: Unlock Account]
                  </button>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-center gap-3">
              <Info className="h-5 w-5 text-green-600" />
              <p className="font-bold">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label htmlFor="signup-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLocked || submitting}
                    placeholder="Enter full name"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLocked || submitting}
                  placeholder="admin@transitops.com"
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">
                  Password
                </label>
                {mode === 'signin' && (
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Mock password is 'password123'"); }} className="text-xs font-medium text-amber-600 hover:text-amber-500">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLocked || submitting}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ROLE DROPDOWN (ONLY SHOWS FOR SIGN IN AS RBAC DEMO HELPER) */}
            {mode === 'signin' && (
              <div>
                <label htmlFor="login-role" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono mb-1.5">
                  Demo RBAC Role (Overrides DB for testing)
                </label>
                <select
                  id="login-role"
                  value={demoRole}
                  onChange={(e) => setDemoRole(e.target.value)}
                  disabled={isLocked || submitting}
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 px-4 text-sm text-gray-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 font-mono disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value="FleetManager">FleetManager (Fleet, Maintenance)</option>
                  <option value="Dispatcher">Dispatcher (Dashboard, Trips)</option>
                  <option value="SafetyOfficer">SafetyOfficer (Drivers, Compliance)</option>
                  <option value="FinancialAnalyst">FinancialAnalyst (Fuel, Analytics)</option>
                </select>
                <p className="mt-1.5 text-[10px] text-gray-400 leading-normal font-sans">
                  * Select the role to override during sign-in to quickly test locked and unlocked views.
                </p>
              </div>
            )}

            {/* REMEMBER ME CHECKBOX */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                disabled={isLocked || submitting}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 select-none">
                Remember my terminal session
              </label>
            </div>

            {/* SUBMIT BUTTON WITH MAGNETIC HOVER */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLocked || submitting}
              className="w-full rounded-2xl bg-amber-500 py-3 text-sm font-bold text-gray-900 border border-transparent shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-300 ease-out btn-magnetic disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? 'Authenticating secure login...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Quick Demo Credentials Panel for testing convenience */}
          {mode === 'signin' && (
            <div className="mt-8 border-t border-gray-150 pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono mb-3">
                Quick-click demo logs ({isMock ? 'Mock DB' : 'Firebase DB'})
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { email: 'admin@transitops.com', label: 'FleetManager' },
                  { email: 'dispatcher@transitops.com', label: 'Dispatcher' },
                  { email: 'safety@transitops.com', label: 'SafetyOfficer' },
                  { email: 'finance@transitops.com', label: 'FinancialAnalyst' },
                ].map((demoUser) => (
                  <button
                    key={demoUser.email}
                    type="button"
                    onClick={() => handleDemoFill(demoUser.email)}
                    disabled={isLocked || submitting}
                    className="p-2 border border-gray-100 rounded-xl hover:border-amber-400 hover:bg-amber-50/10 text-left truncate transition-all text-gray-600 hover:text-gray-900"
                    title={`Click to fill details for ${demoUser.label}`}
                  >
                    <span className="block font-bold text-gray-800 text-[10px]">{demoUser.label}</span>
                    <span className="block text-[9px] text-gray-400 mt-0.5">{demoUser.email}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[9px] text-gray-400 leading-normal">
                * Click any button to auto-fill. Password is: <strong className="font-bold text-gray-500">password123</strong>
              </p>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
