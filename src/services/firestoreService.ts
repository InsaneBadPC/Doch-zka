import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Absence, AppUser, Project, ProjectPhoto, TimeEntry } from '../types';
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

// Otestování spojení se serverem při startu aplikace (dle Firebase Skill)
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

  // Inicializace obousměrné synchronizace mezi Firestore a aplikací
  initRealtimeSync() {
    if (this.isListening) return;
    this.isListening = true;

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
  }

  // --- Absences Firestore Mutations ---
  async saveAbsenceToFirestore(absence: Absence): Promise<void> {
    const path = `absences/${absence.id}`;
    try {
      await setDoc(doc(db, 'absences', absence.id), absence, { merge: true });
    } catch (error) {
      console.warn('Could not save absence to Firestore:', error);
    }
  }

  async deleteAbsenceFromFirestore(absenceId: string): Promise<void> {
    const path = `absences/${absenceId}`;
    try {
      await deleteDoc(doc(db, 'absences', absenceId));
    } catch (error) {
      console.warn('Could not delete absence from Firestore:', error);
    }
  }

  // --- Project Photos Firestore Mutations ---
  async saveProjectPhotoToFirestore(photo: ProjectPhoto): Promise<void> {
    const path = `project_photos/${photo.id}`;
    try {
      await setDoc(doc(db, 'project_photos', photo.id), photo, { merge: true });
    } catch (error) {
      console.warn('Could not save photo to Firestore:', error);
    }
  }

  async deleteProjectPhotoFromFirestore(photoId: string): Promise<void> {
    const path = `project_photos/${photoId}`;
    try {
      await deleteDoc(doc(db, 'project_photos', photoId));
    } catch (error) {
      console.warn('Could not delete photo from Firestore:', error);
    }
  }

  // --- Projects Firestore Mutations ---
  async saveProjectToFirestore(project: Project): Promise<void> {
    const path = `projects/${project.id}`;
    try {
      await setDoc(doc(db, 'projects', project.id), project, { merge: true });
    } catch (error) {
      console.warn('Could not save project to Firestore:', error);
    }
  }

  // --- Time Entries Firestore Mutations ---
  async saveTimeEntryToFirestore(entry: TimeEntry): Promise<void> {
    const path = `time_entries/${entry.id}`;
    try {
      await setDoc(doc(db, 'time_entries', entry.id), entry, { merge: true });
    } catch (error) {
      console.warn('Could not save time entry to Firestore:', error);
    }
  }

  async deleteTimeEntryFromFirestore(entryId: string): Promise<void> {
    const path = `time_entries/${entryId}`;
    try {
      await deleteDoc(doc(db, 'time_entries', entryId));
    } catch (error) {
      console.warn('Could not delete time entry from Firestore:', error);
    }
  }

  cleanup() {
    this.unsubscribeFns.forEach((unsub) => unsub());
    this.unsubscribeFns = [];
    this.isListening = false;
  }
}

export const firestoreSyncService = new FirestoreSyncService();
