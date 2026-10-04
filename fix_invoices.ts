import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching invoices...');
  const snap = await getDocs(collection(db, 'invoices'));
  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.month && data.feeIds && data.feeIds.length > 0) {
      const feeSnap = await getDoc(doc(db, 'fees', data.feeIds[0]));
      if (feeSnap.exists()) {
        const feeData = feeSnap.data();
        if (feeData.month) {
          await updateDoc(doc(db, 'invoices', d.id), { month: feeData.month });
          console.log('Updated invoice', d.id, 'with month', feeData.month);
          updated++;
        }
      }
    }
  }
  console.log('Total updated:', updated);
}

run().catch(console.error);
