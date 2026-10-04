import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

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

// Simple mock for getNextInvoiceNumber (not strictly safe for concurrency but works for one-off sync)
async function getNextInvoiceNumberLocal(): Promise<string> {
    const counterRef = doc(db, 'counters', 'invoiceCounter');
    const { getDoc } = require('firebase/firestore');
    const counterDoc = await getDoc(counterRef);
    let nextValue = 1;

    if (counterDoc.exists()) {
      nextValue = (counterDoc.data().current || 0) + 1;
    }

    await setDoc(counterRef, { current: nextValue }, { merge: true });

    const date = new Date();
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequence = nextValue.toString().padStart(4, '0');

    return `INV-${year}${month}-${sequence}`;
}

async function run() {
  console.log('Fetching fees...');
  const feesSnap = await getDocs(collection(db, 'fees'));
  let syncCount = 0;
  
  for (const feeDoc of feesSnap.docs) {
    const fee = { id: feeDoc.id, ...feeDoc.data() } as any;
    
    // Check if invoice exists for this fee
    let invoiceExists = false;
    if (fee.invoiceId) {
        const { getDoc } = require('firebase/firestore');
        const invSnap = await getDoc(doc(db, 'invoices', fee.invoiceId));
        if (invSnap.exists()) {
            invoiceExists = true;
            
            // Check if month is missing on the invoice but exists on fee
            const invData = invSnap.data();
            if (!invData.month && fee.month) {
                await updateDoc(doc(db, 'invoices', fee.invoiceId), { month: fee.month });
                console.log(`Updated invoice ${fee.invoiceId} with month ${fee.month}`);
            }
        }
    } else {
        // We could also check if there's any invoice containing this feeId
        const q = query(collection(db, 'invoices'), where('feeIds', 'array-contains', fee.id));
        const invSnap2 = await getDocs(q);
        if (!invSnap2.empty) {
            invoiceExists = true;
            const invDoc = invSnap2.docs[0];
            await updateDoc(doc(db, 'fees', fee.id), { invoiceId: invDoc.id });
            console.log(`Linked existing invoice ${invDoc.id} to fee ${fee.id}`);
            
            const invData = invDoc.data();
            if (!invData.month && fee.month) {
                await updateDoc(doc(db, 'invoices', invDoc.id), { month: fee.month });
                console.log(`Updated invoice ${invDoc.id} with month ${fee.month}`);
            }
        }
    }
    
    if (!invoiceExists) {
        console.log(`Missing invoice for fee ${fee.id}. Creating one...`);
        const invId = 'inv-' + Math.random().toString(36).substring(2, 9);
        const invNumber = await getNextInvoiceNumberLocal();
        const now = new Date();
        
        // Try to fetch student to get their category, else default to 'school'
        let category = 'school';
        try {
            const { getDoc } = require('firebase/firestore');
            const studentSnap = await getDoc(doc(db, 'students', fee.studentId));
            if (studentSnap.exists()) {
                category = studentSnap.data().category || 'school';
            }
        } catch(e) {}
        
        const invoice = {
            id: invId,
            invoiceNumber: invNumber,
            studentId: fee.studentId,
            studentName: fee.studentName || 'Unknown Student',
            className: fee.className || 'Unknown Class',
            section: fee.section || 'A',
            items: [{
              id: 'item-1',
              description: fee.description || fee.feeType || 'Fee',
              quantity: 1,
              unitPrice: fee.amount,
              total: fee.amount,
            }],
            subtotal: fee.amount,
            discount: 0,
            discountType: 'fixed',
            tax: 0,
            grandTotal: fee.amount,
            paidAmount: fee.paidAmount || 0,
            status: (fee.paidAmount >= fee.amount) ? 'paid' : 'sent',
            dueDate: fee.dueDate,
            month: fee.month,
            category: category,
            feeIds: [fee.id],
            notes: `Auto-synced for missing invoice.`,
            createdAt: fee.createdAt || now,
            updatedAt: now,
            createdBy: 'system',
        };

        await updateDoc(doc(db, 'fees', fee.id), { invoiceId: invId });
        await setDoc(doc(db, 'invoices', invId), {
            ...invoice,
            createdAt: fee.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        syncCount++;
        console.log(`Created invoice ${invNumber} for fee ${fee.id}`);
    }
  }
  console.log('Total missing invoices created:', syncCount);
}

run().catch(console.error);
