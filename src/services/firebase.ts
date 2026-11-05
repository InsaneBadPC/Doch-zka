import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
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

  // Přihlášení e-mailem a heslem pro zaměstnance
  async signInWithEmail(email: string, pass: string): Promise<AppUser> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = cred.user;
    const userDocRef = doc(db, 'users', fbUser.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      return snap.data() as AppUser;
    }

    const isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const appUser: AppUser = {
      id: fbUser.uid,
      name: fbUser.displayName || email.split('@')[0] || 'Pracovník',
      email: email.trim(),
      role: isOwner ? 'admin' : 'worker',
      defaultHourlyRate: isOwner ? 350 : 250,
      allowCustomRate: isOwner,
      active: true,
    };
    await setDoc(userDocRef, appUser, { merge: true });
    return appUser;
  },

  // Registrace e-mailem a heslem
  async registerWithEmail(
    name: string,
    email: string,
    pass: string,
    hourlyRate: number = 250
  ): Promise<AppUser> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = cred.user;
    try {
      await updateProfile(fbUser, { displayName: name.trim() });
    } catch {}

    const isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const appUser: AppUser = {
      id: fbUser.uid,
      name: name.trim(),
      email: email.trim(),
      role: isOwner ? 'admin' : 'worker',
      defaultHourlyRate: hourlyRate,
      allowCustomRate: false,
      active: true,
    };
    await setDoc(doc(db, 'users', fbUser.uid), appUser);
    return appUser;
  },

  // Autentizace vedení (Šéf - Marek Dubina)
  async signInBoss(password: string): Promise<AppUser | null> {
    const BOSS_EMAIL = 'marek.dubina@dochazka.cz';
    try {
      const cred = await signInWithEmailAndPassword(auth, BOSS_EMAIL, password);
      const fbUser = cred.user;
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const u = snap.data() as AppUser;
        if (u.role !== 'admin') {
          u.role = 'admin';
          await setDoc(userDocRef, u, { merge: true });
        }
        return u;
      }

      const bossUser: AppUser = {
        id: fbUser.uid,
        name: 'Marek Dubina',
        email: BOSS_EMAIL,
        role: 'admin',
        defaultHourlyRate: 350,
        allowCustomRate: true,
        active: true,
      };
      await setDoc(userDocRef, bossUser);
      return bossUser;
    } catch (e: any) {
      if (
        e.code === 'auth/user-not-found' ||
        e.code === 'auth/invalid-credential' ||
        e.code === 'auth/invalid-email'
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, BOSS_EMAIL, password);
          const fbUser = cred.user;
          const bossUser: AppUser = {
            id: fbUser.uid,
            name: 'Marek Dubina',
            email: BOSS_EMAIL,
            role: 'admin',
            defaultHourlyRate: 350,
            allowCustomRate: true,
            active: true,
          };
          await setDoc(doc(db, 'users', fbUser.uid), bossUser);
          return bossUser;
        } catch {
          return null;
        }
      }
      return null;
    }
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
