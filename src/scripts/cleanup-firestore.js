import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load .env file variables manually for node environment execution
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('--- TransitOps Firestore Purger ---');
console.log('Firebase Configuration:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToClean = [
  'vehicles',
  'drivers',
  'trips',
  'maintenance',
  'fuelLogs',
  'expenses'
];

async function purgeCollection(colName) {
  console.log(`\nStarting purge for collection: [${colName}]`);
  try {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    console.log(`Found ${snap.size} documents in [${colName}].`);
    
    let deletedCount = 0;
    for (const document of snap.docs) {
      await deleteDoc(doc(db, colName, document.id));
      deletedCount++;
    }
    console.log(`Purged ${deletedCount} documents from [${colName}].`);
  } catch (error) {
    console.error(`Failed to purge [${colName}]:`, error.message);
  }
}

async function run() {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('mock-')) {
    console.warn('\n[Warning] Running with MOCK Firebase key. Real Firestore collections cannot be modified without a real .env configuration.');
  }
  
  for (const col of collectionsToClean) {
    await purgeCollection(col);
  }
  console.log('\nFirestore purge operation completed.');
  process.exit(0);
}

run();
