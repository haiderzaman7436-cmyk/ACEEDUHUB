import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function inspectData() {
  await signInWithEmailAndPassword(auth, process.env.VITE_ALT_ADMIN_EMAIL!, process.env.VITE_ALT_ADMIN_PASSWORD!);
  
  const feesSnap = await getDocs(collection(db, 'fees'));
  console.log(`Total Fees in DB: ${feesSnap.size}`);
  
  const invoicesSnap = await getDocs(collection(db, 'invoices'));
  console.log(`Total Invoices in DB: ${invoicesSnap.size}`);

  const studentsSnap = await getDocs(collection(db, 'students'));
  console.log(`Total Students in DB: ${studentsSnap.size}`);

  // Count fees by month
  const feesByMonth: any = {};
  feesSnap.forEach(d => {
    const m = d.data().month || 'NO_MONTH';
    feesByMonth[m] = (feesByMonth[m] || 0) + 1;
  });
  console.log('Fees by month:', feesByMonth);

  const templatesSnap = await getDocs(collection(db, 'feeTemplates'));
  const templatesByClass: any = {};
  templatesSnap.forEach(d => {
    const data = d.data();
    if (!templatesByClass[data.className]) templatesByClass[data.className] = 0;
    templatesByClass[data.className]++;
  });
  console.log('Templates by Class:', templatesByClass);

  const studentsByClass: any = {};
  studentsSnap.forEach(d => {
    const data = d.data();
    if (!studentsByClass[data.className]) studentsByClass[data.className] = 0;
    studentsByClass[data.className]++;
  });
  console.log('Students by Class:', studentsByClass);
  process.exit(0);
}

inspectData().catch(console.error);
