import {
  collection,
  doc,
  setDoc,
  getDocFromServer,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Absence, AppUser, Project, ProjectPhoto, SalaryAdvance, TimeEntry } from '../types';
import { storageService } from './storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using local cached persistence.');
    }
    return false;
  }
}

class FirestoreSyncService {
  private isListening = false;
  private unsubscribeFns: (() => void)[] = [];

  initRealtimeSync() {
    if (this.isListening) return;
    this.isListening = true;

    // 0. Synchronizace Uživatelů
    try {
      const usersUnsub = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const remoteUsers: AppUser[] = [];
          snapshot.forEach((d) => {
            remoteUsers.push({ id: d.id, ...d.data() } as AppUser);
          });

          if (remoteUsers.length > 0) {
            const local = storageService.getUsers();
            const localMap = new Map(local.map((u) => [u.id, u]));
            remoteUsers.forEach((r) => {
              const existing = localMap.get(r.id);
              localMap.set(r.id, { ...existing, ...r, password: r.password || existing?.password });
            });
            const merged = Array.from(localMap.values());
            localStorage.setItem('dochazka_users_v3', JSON.stringify(merged));
            storageService.notify();
          }
        },
        (error) => {
          console.warn('Realtime sync users note:', error.message);
        }
      );
      this.unsubscribeFns.push(usersUnsub);
    } catch (e) {
      console.warn('Could not attach users listener:', e);
    }

    // 1. Synchronizace Absencí / Žádostí o volno
    try {
      const absencesUnsub = onSnapshot(
        collection(db, 'absences'),
        (snapshot) => {
          const remoteList: Absence[] = [];
          snapshot.forEach((d) => {
            remoteList.push({ id: d.id, ...d.data() } as Absence);
          });

          if (remoteList.length > 0) {
            const local = storageService.getAbsences();
            const localMap = new Map(local.map((a) => [a.id, a]));
            remoteList.forEach((r) => localMap.set(r.id, r));
            const merged = Array.from(localMap.values());
            localStorage.setItem('dochazka_absences_v3', JSON.stringify(merged));
            storageService.notify();
          }
        },
        (error) => {
          console.warn('Realtime sync absences note:', error.message);
        }
      );
      this.unsubscribeFns.push(absencesUnsub);
    } catch (e) {
      console.warn('Could not attach absences listener:', e);
    }

    // 2. Synchronizace Fotodokumentace k zakázkám
    try {
      const photosUnsub = onSnapshot(
        collection(db, 'project_photos'),
        (snapshot) => {
          const remotePhotos: ProjectPhoto[] = [];
          snapshot.forEach((d) => {
            remotePhotos.push({ id: d.id, ...d.data() } as ProjectPhoto);
          });

          if (remotePhotos.length > 0) {
            const local = storageService.getProjectPhotos();
            const localMap = new Map(local.map((p) => [p.id, p]));
            remotePhotos.forEach((r) => localMap.set(r.id, r));
            const merged = Array.from(localMap.values());
            localStorage.setItem('dochazka_photos_v3', JSON.stringify(merged));
            storageService.notify();
          }
        },
        (error) => {
          console.warn('Realtime sync photos note:', error.message);
        }
      );
      this.unsubscribeFns.push(photosUnsub);
    } catch (e) {
      console.warn('Could not attach photos listener:', e);
    }

    // 3. Synchronizace Zakázek
    try {
      const projectsUnsub = onSnapshot(
        collection(db, 'projects'),
        (snapshot) => {
          const remoteProjects: Project[] = [];
          snapshot.forEach((d) => {
            remoteProjects.push({ id: d.id, ...d.data() } as Project);
          });

          if (remoteProjects.length > 0) {
            const local = storageService.getProjects();
            const localMap = new Map(local.map((p) => [p.id, p]));
            remoteProjects.forEach((r) => localMap.set(r.id, r));
            const merged = Array.from(localMap.values());
            localStorage.setItem('dochazka_projects_v3', JSON.stringify(merged));
            storageService.notify();
          }
        },
        (error) => {
          console.warn('Realtime sync projects note:', error.message);
        }
      );
      this.unsubscribeFns.push(projectsUnsub);
    } catch (e) {
      console.warn('Could not attach projects listener:', e);
    }

    // 4. Synchronizace Směn (Time Entries)
    try {
      const entriesUnsub = onSnapshot(
        collection(db, 'time_entries'),
        (snapshot) => {
          const remoteEntries: TimeEntry[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            let appAt = data.approvedAt;
            if (appAt && typeof appAt === 'object' && typeof appAt.toDate === 'function') {
              appAt = appAt.toDate().toISOString();
            }
            remoteEntries.push({
              id: d.id,
              ...data,
              approvedAt: appAt || null,
            } as TimeEntry);
          });

          if (remoteEntries.length > 0) {
            const local = storageService.getTimeEntries();
            const localMap = new Map(local.map((e) => [e.id, e]));
            remoteEntries.forEach((r) => localMap.set(r.id, r));
            const merged = Array.from(localMap.values());
            localStorage.setItem('dochazka_entries_v3', JSON.stringify(merged));
            storageService.notify();
          }
        },
        (error) => {
          console.warn('Realtime sync time_entries note:', error.message);
        }
      );
      this.unsubscribeFns.push(entriesUnsub);
    } catch (e) {
      console.warn('Could not attach time_entries listener:', e);
    }

    // 5. Synchronizace Záloh (Advances)
    try {
      const advancesUnsub = onSnapshot(
        collection(db, 'advances'),
        (snapshot) => {
          const remoteAdv: SalaryAdvance[] = [];
          snapshot.forEach((d) => {
            remoteAdv.push({ id: d.id, ...d.data() } as SalaryAdvance);
          });
          if (remoteAdv.length > 0) {
            const local = storageService.getAdvances();
            const localMap = new Map(local.map((a) => [a.id, a]));
            remoteAdv.forEach((r) => localMap.set(r.id, r));
            const merged = Array.from(localMap.values());
            localStorage.setItem('dochazka_advances_v3', JSON.stringify(merged));
            storageService.notify();
          }
        },
        (error) => {
          console.warn('Realtime sync advances note:', error.message);
        }
      );
      this.unsubscribeFns.push(advancesUnsub);
    } catch (e) {
      console.warn('Could not attach advances listener:', e);
    }
  }

  // --- Users Firestore Mutations ---
  async saveUserToFirestore(user: AppUser): Promise<void> {
    try {
      await setDoc(doc(db, 'users', user.id), user, { merge: true });
    } catch (error) {
      console.warn('Could not save user to Firestore:', error);
    }
  }

  async deleteUserFromFirestore(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      console.warn('Could not delete user from Firestore:', error);
    }
  }

  // --- Absences Firestore Mutations ---
  async saveAbsenceToFirestore(absence: Absence): Promise<void> {
    try {
      await setDoc(doc(db, 'absences', absence.id), absence, { merge: true });
    } catch (error) {
      console.warn('Could not save absence to Firestore:', error);
    }
  }

  async deleteAbsenceFromFirestore(absenceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'absences', absenceId));
    } catch (error) {
      console.warn('Could not delete absence from Firestore:', error);
    }
  }

  // --- Project Photos Firestore Mutations ---
  async saveProjectPhotoToFirestore(photo: ProjectPhoto): Promise<void> {
    try {
      await setDoc(doc(db, 'project_photos', photo.id), photo, { merge: true });
    } catch (error) {
      console.warn('Could not save photo to Firestore:', error);
    }
  }

  async deleteProjectPhotoFromFirestore(photoId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'project_photos', photoId));
    } catch (error) {
      console.warn('Could not delete photo from Firestore:', error);
    }
  }

  // --- Projects Firestore Mutations ---
  async saveProjectToFirestore(project: Project): Promise<void> {
    try {
      await setDoc(doc(db, 'projects', project.id), project, { merge: true });
    } catch (error) {
      console.warn('Could not save project to Firestore:', error);
    }
  }

  async deleteProjectFromFirestore(projectId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
    } catch (error) {
      console.warn('Could not delete project from Firestore:', error);
    }
  }

  // --- Time Entries Firestore Mutations ---
  async saveTimeEntryToFirestore(entry: TimeEntry): Promise<void> {
    try {
      await setDoc(doc(db, 'time_entries', entry.id), entry, { merge: true });
    } catch (error) {
      console.warn('Could not save time entry to Firestore:', error);
    }
  }

  async deleteTimeEntryFromFirestore(entryId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'time_entries', entryId));
    } catch (error) {
      console.warn('Could not delete time entry from Firestore:', error);
    }
  }

  // --- Salary Advances Firestore Mutations ---
  async saveAdvanceToFirestore(advance: SalaryAdvance): Promise<void> {
    try {
      await setDoc(doc(db, 'advances', advance.id), advance, { merge: true });
    } catch (error) {
      console.warn('Could not save advance to Firestore:', error);
    }
  }

  async deleteAdvanceFromFirestore(advanceId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'advances', advanceId));
    } catch (error) {
      console.warn('Could not delete advance from Firestore:', error);
    }
  }

  cleanup() {
    this.unsubscribeFns.forEach((unsub) => unsub());
    this.unsubscribeFns = [];
    this.isListening = false;
  }
}

export const firestoreSyncService = new FirestoreSyncService();
