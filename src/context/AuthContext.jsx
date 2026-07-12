import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Lockout State
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('failed_attempts') || '0', 10);
  });
  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem('login_locked') === 'true';
  });

  const isMock = import.meta.env.VITE_FIREBASE_API_KEY.startsWith('mock-');

  // Load mock users from localStorage for demo/testing convenience
  const getMockUsers = () => {
    const defaultUsers = {
      'admin@transitops.com': { uid: 'mock-uid-1', name: 'Fleet Manager Admin', email: 'admin@transitops.com', role: 'FleetManager', status: 'Active' },
      'dispatcher@transitops.com': { uid: 'mock-uid-2', name: 'Joe Dispatcher', email: 'dispatcher@transitops.com', role: 'Dispatcher', status: 'Active' },
      'safety@transitops.com': { uid: 'mock-uid-3', name: 'Jane Safety', email: 'safety@transitops.com', role: 'SafetyOfficer', status: 'Active' },
      'finance@transitops.com': { uid: 'mock-uid-4', name: 'Frank Finance', email: 'finance@transitops.com', role: 'FinancialAnalyst', status: 'Active' },
    };
    const stored = localStorage.getItem('mock_users');
    if (!stored) {
      localStorage.setItem('mock_users', JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    return JSON.parse(stored);
  };

  useEffect(() => {
    if (isMock) {
      const sessionUser = localStorage.getItem('mock_session_user');
      if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        setUser(parsed);
        setRole(parsed.role);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser(firebaseUser);
            setRole(data.role);
          } else {
            setUser(firebaseUser);
            setRole('Dispatcher'); // fallback role
          }
        } catch (error) {
          console.error("Error fetching user role from Firestore:", error);
          setUser(firebaseUser);
          setRole('Dispatcher');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [isMock]);

  const handleFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    localStorage.setItem('failed_attempts', nextAttempts.toString());
    if (nextAttempts >= 5) {
      setIsLocked(true);
      localStorage.setItem('login_locked', 'true');
    }
  };

  const resetFailedAttempts = () => {
    setFailedAttempts(0);
    setIsLocked(false);
    localStorage.removeItem('failed_attempts');
    localStorage.removeItem('login_locked');
  };

  const signIn = async (email, password, demoRoleOverride) => {
    if (isLocked) {
      throw new Error("Invalid credentials — Account locked after 5 failed attempts");
    }

    if (isMock) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockUsers = getMockUsers();
      const matched = mockUsers[email.toLowerCase()];

      // For mock mode, password is 'password123'
      if (matched && password === 'password123') {
        // Use dropdown demoRoleOverride if specified, otherwise the user's role
        const activeRole = demoRoleOverride || matched.role;
        const loggedInUser = { ...matched, role: activeRole };
        
        setUser(loggedInUser);
        setRole(activeRole);
        localStorage.setItem('mock_session_user', JSON.stringify(loggedInUser));
        resetFailedAttempts();
        return loggedInUser;
      } else {
        handleFailedAttempt();
        throw new Error("Invalid credentials — Account locked after 5 failed attempts");
      }
    }

    // Real Firebase Auth Sign In
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      let finalRole = 'Dispatcher';
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        const docData = userDoc.data();
        // If dropdown override is specified, use it for local demo testing, else real db role
        finalRole = demoRoleOverride || docData.role;
      } else {
        // User doc missing, initialize it
        finalRole = demoRoleOverride || 'Dispatcher';
        await setDoc(doc(db, 'users', fbUser.uid), {
          uid: fbUser.uid,
          name: fbUser.displayName || email.split('@')[0],
          email: fbUser.email,
          role: finalRole,
          status: 'Active'
        });
      }
      
      setUser(fbUser);
      setRole(finalRole);
      resetFailedAttempts();
      return fbUser;
    } catch (error) {
      handleFailedAttempt();
      throw new Error("Invalid credentials — Account locked after 5 failed attempts");
    }
  };

  const signUp = async (email, password, name) => {
    if (isLocked) {
      throw new Error("Invalid credentials — Account locked after 5 failed attempts");
    }

    if (isMock) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockUsers = getMockUsers();
      if (mockUsers[email.toLowerCase()]) {
        throw new Error("User already exists");
      }
      
      const newUser = {
        uid: 'mock-uid-' + Math.random().toString(36).substring(2, 9),
        name,
        email,
        role: 'Dispatcher', // Default role for signup
        status: 'Active'
      };
      
      mockUsers[email.toLowerCase()] = newUser;
      localStorage.setItem('mock_users', JSON.stringify(mockUsers));
      
      setUser(newUser);
      setRole(newUser.role);
      localStorage.setItem('mock_session_user', JSON.stringify(newUser));
      resetFailedAttempts();
      return newUser;
    }

    // Real Firebase Auth Sign Up
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      
      const newUserDoc = {
        uid: fbUser.uid,
        name: name,
        email: email,
        role: 'Dispatcher', // Default placeholder role for signup
        status: 'Active'
      };
      
      await setDoc(doc(db, 'users', fbUser.uid), newUserDoc);
      setUser(fbUser);
      setRole(newUserDoc.role);
      resetFailedAttempts();
      return fbUser;
    } catch (error) {
      throw error;
    }
  };

  const logOut = async () => {
    if (isMock) {
      setUser(null);
      setRole(null);
      localStorage.removeItem('mock_session_user');
      return;
    }
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      signIn,
      signUp,
      logOut,
      failedAttempts,
      isLocked,
      resetFailedAttempts,
      isMock
    }}>
      {children}
    </AuthContext.Provider>
  );
};
