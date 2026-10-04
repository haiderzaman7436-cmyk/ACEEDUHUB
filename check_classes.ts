import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.resolve(process.cwd(), '.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  try {
    const email = process.env.VITE_ALT_ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'admin@aceeduhub.com';
    const password = process.env.VITE_ALT_ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'admin123';
    
    console.log(`Authenticating with ${email}...`);
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Authenticated.');

    const studentsSnap = await getDocs(collection(db, 'students'));
    const templatesSnap = await getDocs(collection(db, 'feeTemplates'));

    const studentClasses: Record<string, number> = {};
    let activeStudents = 0;
    
    studentsSnap.docs.forEach(d => {
      const s = d.data();
      if (s.status === 'active') {
        activeStudents++;
        studentClasses[s.className] = (studentClasses[s.className] || 0) + 1;
      }
    });

    const templateClasses = new Set<string>();
    templatesSnap.docs.forEach(d => {
      templateClasses.add(d.data().className);
    });

    console.log('\n--- ACTIVE STUDENTS ---');
    console.log(`Total Active Students: ${activeStudents}`);
    
    console.log('\n--- CLASSES WITHOUT TEMPLATES ---');
    for (const [className, count] of Object.entries(studentClasses)) {
      if (!templateClasses.has(className)) {
        console.log(`- ${className}: ${count} students`);
      }
    }

    console.log('\n--- EXISTING TEMPLATES ---');
    for (const tc of templateClasses) {
      console.log(`- ${tc}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
