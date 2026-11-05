import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, Project, TimeEntry } from '../types';

// Inicializace Firebase aplikace
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Použití zadaného firestoreDatabaseId
export const db = getFirestore(
  app,
  (firebaseConfig as any).firestoreDatabaseId || undefined
);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Povolení offline perzistence pro Spark plán (bez chyb v případě nepodporovaného prohlížeče)
try {
  enableIndexedDbPersistence(db).catch(() => {
    // Ignorujeme vícenásobné taby
  });
} catch {
  // Ignorujeme
}

const OWNER_EMAIL = 'insanebad2@gmail.com';

export const firebaseAuthService = {
  // Přihlášení přes Google účet
  async signInWithGoogle(): Promise<AppUser> {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const email = fbUser.email || '';
    const isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();

    // Zkontrolujeme, zda uživatel již existuje v kolekci users
    const userDocRef = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(userDocRef);

    let appUser: AppUser;
    if (snap.exists()) {
      appUser = snap.data() as AppUser;
      // Pokud je to vlastník, zajistíme admin roli
      if (isOwner && appUser.role !== 'admin') {
        appUser.role = 'admin';
        appUser.allowCustomRate = true;
        await setDoc(userDocRef, appUser, { merge: true });
      }
    } else {
      appUser = {
        id: fbUser.uid,
        name: fbUser.displayName || email.split('@')[0] || 'Pracovník',
        email: email,
        role: isOwner ? 'admin' : 'worker',
        defaultHourlyRate: isOwner ? 350 : 250,
        allowCustomRate: isOwner,
        active: true,
      };
      await setDoc(userDocRef, appUser);
    }

    return appUser;
  },

  // Odhlášení
  async logout(): Promise<void> {
    await signOut(auth);
  },

  // Sledování stavu autentizace
  onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};
