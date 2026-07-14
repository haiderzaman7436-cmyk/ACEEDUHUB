import { collection, doc, getDocs, updateDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '@/lib/firebase';
import type { AppUser, UserRole } from '@/types';

/**
 * Fetch all users from Firestore
 */
export async function getUsers(): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      email: data.email || '',
      displayName: data.displayName || 'Unknown',
      role: data.role || 'manager',
      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
    } as AppUser;
  });
}

/**
 * Creates a new user using the secondaryAuth instance to prevent the admin from being logged out.
 */
export async function createUser(data: {
  email: string;
  password?: string;
  displayName: string;
  role: UserRole;
}): Promise<void> {
  const defaultPassword = data.password || 'Ace@12345';
  
  // 1. Create auth user
  const userCredential = await createUserWithEmailAndPassword(
    secondaryAuth,
    data.email,
    defaultPassword
  );
  
  const uid = userCredential.user.uid;

  // 2. Save user profile in Firestore
  await setDoc(doc(db, 'users', uid), {
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    isActive: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  });

  // 3. Immediately sign out of secondary auth to clean up
  await signOut(secondaryAuth);
}

/**
 * Updates an existing user's role
 */
export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role: newRole,
  });
}

/**
 * Toggles user active status
 */
export async function toggleUserStatus(uid: string, isActive: boolean): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    isActive,
  });
}
