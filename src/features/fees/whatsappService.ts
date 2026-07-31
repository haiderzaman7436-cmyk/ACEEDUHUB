import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Fee, Invoice, Student } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

function sanitizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let clean = phone.replace(/\D/g, '');
  // If it starts with 0 (e.g. 03001234567), replace with Pakistan country code 92
  if (clean.startsWith('0')) {
    clean = '92' + clean.slice(1);
  }
  return clean;
}

function generateUrduMessage(record: Fee | Invoice, type: 'Fee' | 'Invoice', msgType: 'alert' | 'reminder' = 'alert'): string {
  const totalAmount = type === 'Fee' ? (record as Fee).amount : (record as Invoice).grandTotal;
  const remaining = totalAmount - (record.paidAmount || 0);
  
  if (msgType === 'reminder') {
    return `\u200F*ACE Educational Hub*

\u200Fمحترم والدین!
\u200Fالسلامُ علیکم ۔ جیساکہ آپ کو علم ھے کہ فیس جمع کروانے کی آخری تاریخ ہر ماہ کی 8 ہوتی ہے۔
\u200Fبراہ مہربانی مقررہ تاریخ گزرنے سے پہلے اپنے بچوں کے تعلیمی واجبات جمع کروا دیں۔

\u200Fتفصیلات:
\u200Fطالب علم کا نام: ${record.studentName}
\u200Fکلاس: ${record.className} - سیکشن: ${record.section}
\u200Fکل رقم: ${formatCurrency(totalAmount)}
\u200Fمقررہ تاریخ: ${record.dueDate ? formatDate(record.dueDate) : 'دستیاب نہیں'}

\u200Fشکریہ،
\u200F*ACE Educational Hub*`;
  }

  return `\u200F*ACE Educational Hub*

\u200Fمعزز والدین،
\u200Fہمیں آپ کو یاد دلانا مقصود ہے کہ آپ کے بچے کے واجبات کی ادائیگی کا وقت گزر چکا ہے۔

\u200Fتفصیلات:
\u200Fطالب علم کا نام: ${record.studentName}
\u200Fکلاس: ${record.className} - سیکشن: ${record.section}
${type === 'Fee' ? `\u200Fفیس کی قسم: ${(record as Fee).feeType}` : ''}
\u200Fکل رقم: ${formatCurrency(totalAmount)}
\u200Fباقی رقم: ${formatCurrency(remaining)}
\u200Fمقررہ تاریخ: ${record.dueDate ? formatDate(record.dueDate) : 'دستیاب نہیں'}

\u200Fبراہ کرم جلد از جلد واجبات جمع کروائیں۔
\u200Fشکریہ،
\u200F*ACE Educational Hub*`;
}

export async function sendWhatsAppAlert(record: Fee | Invoice, type: 'Fee' | 'Invoice', msgType: 'alert' | 'reminder' = 'alert') {
  try {
    // Fetch the student to get the phone number
    const studentSnap = await getDoc(doc(db, 'students', record.studentId));
    if (!studentSnap.exists()) {
      toast.error('Student record not found.');
      return;
    }
    
    const student = studentSnap.data() as Student;
    let phone = student.phone;
    
    // Fallback to guardian phone
    if (!phone && student.guardians && student.guardians.length > 0) {
      phone = student.guardians[0].phone;
    }

    if (!phone) {
      toast.error('No phone number found for this student or guardian.');
      return;
    }

    const cleanPhone = sanitizePhoneNumber(phone);
    const text = encodeURIComponent(generateUrduMessage(record, type, msgType));
    
    const url = `https://wa.me/${cleanPhone}?text=${text}`;
    
    // Open in new tab
    window.open(url, '_blank');
    
    // Mark as sent in database
    const collectionName = type === 'Fee' ? 'fees' : 'invoices';
    try {
      await updateDoc(doc(db, collectionName, record.id), {
        alertSentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('Failed to update alertSentAt', dbErr);
    }
    
  } catch (error) {
    console.error('Error sending WhatsApp alert:', error);
    toast.error('Failed to send WhatsApp alert.');
  }
}
