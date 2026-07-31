import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Generates a strictly sequential invoice number using a Firestore Transaction.
 * e.g., INV-2607-0001
 */
export async function getNextInvoiceNumber(): Promise<string> {
  const counterRef = doc(db, 'counters', 'invoiceCounter');

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextValue = 1;

    if (counterDoc.exists()) {
      nextValue = (counterDoc.data().current || 0) + 1;
    }

    transaction.set(counterRef, { current: nextValue }, { merge: true });

    const date = new Date();
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequence = nextValue.toString().padStart(4, '0');

    return `INV-${year}${month}-${sequence}`;
  });
}
