import { Absence, AbsenceStatus, AppUser, GpsLocation, Project, ProjectPhoto, ProjectStatus, TimeEntry } from '../types';
import { firestoreSyncService } from './firestoreService';

const STORAGE_KEY_USERS = 'dochazka_users_v3';
const STORAGE_KEY_PROJECTS = 'dochazka_projects_v3';
const STORAGE_KEY_ENTRIES = 'dochazka_entries_v3';
const STORAGE_KEY_CURRENT_USER = 'dochazka_auth_user_v3';
const STORAGE_KEY_PHOTOS = 'dochazka_photos_v3';
const STORAGE_KEY_ABSENCES = 'dochazka_absences_v3';

export const BOSS_NAME = 'Marek Dubina';
export const BOSS_PASSWORD = 'MarekDubina4786';
export const BOSS_EMAIL = 'marek.dubina@dochazka.cz';

const INITIAL_USERS: AppUser[] = [
  {
    id: 'user-boss-marek-dubina',
    name: BOSS_NAME,
    email: BOSS_EMAIL,
    role: 'admin',
    defaultHourlyRate: 350,
    allowCustomRate: true,
    active: true,
    password: BOSS_PASSWORD,
  },
  {
    id: 'user-worker-petr-lukes',
    name: 'Petr Lukeš',
    email: 'insanebad2@gmail.com',
    role: 'worker',
    defaultHourlyRate: 200,
    allowCustomRate: false,
    active: true,
    password: 'Heslo0897@',
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-default-main',
    name: 'Hlavní provoz / Zakázka',
    client: 'Firemní zakázky',
    status: 'open',
    budgetLimitKcz: 150000,
    createdAt: new Date().toISOString(),
  },
];

class StorageService {
  private listeners: (() => void)[] = [];

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    try {
      // Migrace uživatelů z v2, pokud v3 ještě neexistuje
      const rawV3 = localStorage.getItem(STORAGE_KEY_USERS);
      const rawV2 = localStorage.getItem('dochazka_users_v2');
      let existingUsers: AppUser[] = [];
      if (rawV3) {
        existingUsers = JSON.parse(rawV3);
      } else if (rawV2) {
        existingUsers = JSON.parse(rawV2);
      }

      // Odstraníme starý placeholder účet 'user-owner', který dříve kolidoval s e-mailem Petra Lukeše
      existingUsers = existingUsers.filter((u) => u.id !== 'user-owner');

      // Garantujeme přítomnost Marka Dubiny (admin)
      const bossIdx = existingUsers.findIndex(
        (u) => u.id === 'user-boss-marek-dubina' || u.email.toLowerCase() === BOSS_EMAIL.toLowerCase()
      );
      if (bossIdx === -1) {
        existingUsers.unshift({ ...INITIAL_USERS[0] });
      } else {
        existingUsers[bossIdx] = {
          ...existingUsers[bossIdx],
          id: 'user-boss-marek-dubina',
          name: existingUsers[bossIdx].name || BOSS_NAME,
          email: BOSS_EMAIL,
          role: 'admin',
          defaultHourlyRate: existingUsers[bossIdx].defaultHourlyRate || 350,
          allowCustomRate: true,
          active: true,
          password: BOSS_PASSWORD,
        };
      }

      // Garantujeme přítomnost Petra Lukeše (worker, 200 Kč/h)
      const petrIdx = existingUsers.findIndex(
        (u) => u.id === 'user-worker-petr-lukes' || u.email.toLowerCase() === 'insanebad2@gmail.com'
      );
      if (petrIdx === -1) {
        existingUsers.push({ ...INITIAL_USERS[1] });
      } else {
        existingUsers[petrIdx] = {
          ...existingUsers[petrIdx],
          id: 'user-worker-petr-lukes',
          name: existingUsers[petrIdx].name && existingUsers[petrIdx].name !== 'Správce docházky'
            ? existingUsers[petrIdx].name
            : 'Petr Lukeš',
          email: 'insanebad2@gmail.com',
          role: 'worker',
          defaultHourlyRate: existingUsers[petrIdx].defaultHourlyRate === 350 ? 200 : (existingUsers[petrIdx].defaultHourlyRate || 200),
          password: existingUsers[petrIdx].password || 'Heslo0897@',
          active: existingUsers[petrIdx].active ?? true,
        };
      }

      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(existingUsers));

      // Vyčištění zastaralých klíčů
      localStorage.removeItem('dochazka_users_v2');
      localStorage.removeItem('dochazka_projects_v2');
      localStorage.removeItem('dochazka_entries_v2');
      localStorage.removeItem('dochazka_photos_v2');
      localStorage.removeItem('dochazka_absences_v2');
      localStorage.removeItem('dochazka_auth_user_v2');
      localStorage.removeItem('dochazka_auth_user');
      localStorage.removeItem('dochazka_projects');
      localStorage.removeItem('dochazka_entries');
    } catch {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
    }

    // Zakázky – pokud je seznam prázdný, vložíme výchozí otevřenou zakázku, aby šly ihned spouštět směny
    try {
      const rawProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
      const parsedProjects: Project[] = rawProjects ? JSON.parse(rawProjects) : [];
      if (!Array.isArray(parsedProjects) || parsedProjects.length === 0) {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
      }
    } catch {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
    }

    if (!localStorage.getItem(STORAGE_KEY_ENTRIES)) {
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEY_PHOTOS)) {
      localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEY_ABSENCES)) {
      localStorage.setItem(STORAGE_KEY_ABSENCES, JSON.stringify([]));
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Auth / Current User ---
  getCurrentUser(): AppUser | null {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!raw) return null;
    try {
      const u = JSON.parse(raw) as AppUser;
      const all = this.getUsers();
      const fresh = all.find(
        (x) => x.id === u.id || (u.email && x.email.toLowerCase() === u.email.toLowerCase())
      );
      return fresh || u;
    } catch {
      return null;
    }
  }

  setCurrentUser(user: AppUser | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
    this.notify();
  }

  loginBoss(password: string, loginName?: string): AppUser {
    const cleanPass = password.trim();
    if (cleanPass !== BOSS_PASSWORD) {
      throw new Error('Nesprávné heslo pro přístup vedení.');
    }

    const users = this.getUsers();
    let boss = users.find(
      (u) =>
        u.id === 'user-boss-marek-dubina' ||
        u.email.toLowerCase() === BOSS_EMAIL.toLowerCase() ||
        u.name.toLowerCase() === BOSS_NAME.toLowerCase()
    );

    if (!boss) {
      boss = {
        id: 'user-boss-marek-dubina',
        name: loginName && loginName.trim().length > 0 ? loginName.trim() : BOSS_NAME,
        email: BOSS_EMAIL,
        role: 'admin',
        defaultHourlyRate: 350,
        allowCustomRate: true,
        active: true,
        password: BOSS_PASSWORD,
      };
      users.unshift(boss);
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } else {
      if (loginName && loginName.trim().length > 0) {
        boss.name = loginName.trim();
      }
      boss.role = 'admin';
      boss.password = BOSS_PASSWORD;
      boss.allowCustomRate = true;
      boss.active = true;
      this.updateUser(boss);
    }

    try {
      firestoreSyncService.saveUserToFirestore(boss);
    } catch {}

    this.setCurrentUser(boss);
    return boss;
  }

  login(identifier: string, password?: string): AppUser | null {
    const users = this.getUsers();
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password ? password.trim() : '';

    // Pokud se snaží přihlásit jako Marek Dubina
    if (cleanId === BOSS_NAME.toLowerCase() || cleanId === BOSS_EMAIL.toLowerCase()) {
      return this.loginBoss(cleanPass, cleanId === BOSS_NAME.toLowerCase() ? BOSS_NAME : undefined);
    }

    let found = users.find(
      (u) => u.email.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId
    );

    // Garantovaný účet Petra Lukeše
    if (!found && cleanId === 'insanebad2@gmail.com') {
      found = { ...INITIAL_USERS[1] };
      users.push(found);
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }

    if (!found) {
      return null;
    }

    if (found.password && cleanPass && found.password !== cleanPass) {
      throw new Error('Nesprávné heslo.');
    }

    if (!found.password && cleanPass) {
      found.password = cleanPass;
      this.updateUser(found);
    }

    try {
      firestoreSyncService.saveUserToFirestore(found);
    } catch {}

    this.setCurrentUser(found);
    return found;
  }

  loginWithGoogleAccount(email: string, displayName?: string): AppUser {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const isPetr = cleanEmail === 'insanebad2@gmail.com';
    const isBoss = cleanEmail === BOSS_EMAIL.toLowerCase();

    let found = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      const fallbackName = isBoss
        ? BOSS_NAME
        : isPetr
          ? 'Petr Lukeš'
          : displayName && displayName.trim().length > 0
            ? displayName.trim()
            : cleanEmail.split('@')[0];

      found = {
        id: isBoss
          ? 'user-boss-marek-dubina'
          : isPetr
            ? 'user-worker-petr-lukes'
            : 'usr-' + Date.now(),
        name: fallbackName,
        email: cleanEmail,
        role: isBoss ? 'admin' : 'worker',
        defaultHourlyRate: isBoss ? 350 : isPetr ? 200 : 250,
        allowCustomRate: isBoss,
        active: true,
      };
      users.push(found);
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } else if (isPetr) {
      found.name = 'Petr Lukeš';
      found.defaultHourlyRate = 200;
      this.updateUser(found);
    }

    try {
      firestoreSyncService.saveUserToFirestore(found);
    } catch {}

    this.setCurrentUser(found);
    return found;
  }

  register(
    name: string,
    email: string,
    role: 'worker' | 'admin' = 'worker',
    rate: number = 250,
    password?: string
  ): AppUser {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('Uživatel s tímto e-mailem již v systému existuje.');
    }

    const newUser: AppUser = {
      id: 'usr-' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      role,
      defaultHourlyRate: rate,
      allowCustomRate: role === 'admin',
      active: true,
      password: password ? password.trim() : undefined,
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    try {
      firestoreSyncService.saveUserToFirestore(newUser);
    } catch {}
    this.setCurrentUser(newUser);
    this.notify();
    return newUser;
  }

  // --- Users ---
  getUsers(): AppUser[] {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return [...INITIAL_USERS];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_USERS];
    } catch {
      return [...INITIAL_USERS];
    }
  }

  updateUser(updated: AppUser) {
    const users = this.getUsers().map((u) => (u.id === updated.id ? updated : u));
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    const cur = this.getCurrentUser();
    if (cur && cur.id === updated.id) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updated));
    }
    try {
      firestoreSyncService.saveUserToFirestore(updated);
    } catch {}
    this.notify();
  }

  addUser(
    name: string,
    email: string,
    role: 'worker' | 'admin',
    rate: number,
    allowCustom: boolean,
    password?: string
  ): AppUser {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Uživatel s tímto e-mailem již existuje.');
    }
    const newUser: AppUser = {
      id: 'usr-' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      role,
      defaultHourlyRate: rate,
      allowCustomRate: allowCustom,
      active: true,
      password: password && password.trim().length > 0 ? password.trim() : undefined,
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    try {
      firestoreSyncService.saveUserToFirestore(newUser);
    } catch {}
    this.notify();
    return newUser;
  }

  deleteUser(userId: string) {
    const users = this.getUsers().filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    try {
      firestoreSyncService.deleteUserFromFirestore(userId);
    } catch {}
    this.notify();
  }

  // --- Projects ---
  getProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) return [...INITIAL_PROJECTS];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_PROJECTS];
    } catch {
      return [...INITIAL_PROJECTS];
    }
  }

  createProject(name: string, client: string, budgetLimitKcz: number): Project {
    const projects = this.getProjects();
    const newProj: Project = {
      id: 'prj-' + Date.now(),
      name: name.trim(),
      client: client.trim(),
      status: 'open',
      budgetLimitKcz,
      createdAt: new Date().toISOString(),
    };
    projects.push(newProj);
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    try {
      firestoreSyncService.saveProjectToFirestore(newProj);
    } catch {}
    this.notify();
    return newProj;
  }

  toggleProjectStatus(projectId: string): ProjectStatus {
    const projects = this.getProjects();
    let nextStatus: ProjectStatus = 'closed';
    let targetProj: Project | null = null;
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        nextStatus = p.status === 'open' ? 'closed' : 'open';
        targetProj = { ...p, status: nextStatus };
        return targetProj;
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
    if (targetProj) {
      try {
        firestoreSyncService.saveProjectToFirestore(targetProj);
      } catch {}
    }
    this.notify();
    return nextStatus;
  }

  deleteProject(projectId: string) {
    const projects = this.getProjects().filter((p) => p.id !== projectId);
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    try {
      firestoreSyncService.deleteProjectFromFirestore(projectId);
    } catch {}
    this.notify();
  }

  // --- Time Entries ---
  getTimeEntries(): TimeEntry[] {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  checkCollision(userId: string, newStart: Date, newEnd: Date, excludeId?: string): boolean {
    const entries = this.getTimeEntries().filter((e) => e.userId === userId && e.id !== excludeId);
    for (const entry of entries) {
      if (!entry.startTime || !entry.endTime) continue;
      const exStart = new Date(entry.startTime);
      const exEnd = new Date(entry.endTime);
      if (isNaN(exStart.getTime()) || isNaN(exEnd.getTime())) continue;

      if (newStart < exEnd && newEnd > exStart) {
        return true;
      }
    }
    return false;
  }

  startLiveShift(user: AppUser, project: Project, startLocation?: GpsLocation | null): TimeEntry {
    const now = new Date();
    const newEntry: TimeEntry = {
      id: 'ent-' + Date.now(),
      userId: user.id,
      userName: user.name,
      projectId: project.id,
      projectName: project.name,
      date: now.toISOString().substring(0, 10),
      startTime: now.toISOString(),
      endTime: null,
      breakMinutes: 0,
      hoursWorked: 0,
      hourlyRate: user.defaultHourlyRate,
      isCustomRate: false,
      totalAmount: 0,
      note: '',
      status: 'draft',
      isRunning: true,
      adminComment: '',
      approvedBy: null,
      approvedAt: null,
      startLocation: startLocation || null,
      endLocation: null,
    };

    const entries = this.getTimeEntries();
    entries.unshift(newEntry);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
    try {
      firestoreSyncService.saveTimeEntryToFirestore(newEntry);
    } catch {}
    return newEntry;
  }

  updateShiftLocation(entryId: string, startLocation?: GpsLocation | null, endLocation?: GpsLocation | null) {
    const entries = this.getTimeEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    if (startLocation !== undefined) entry.startLocation = startLocation;
    if (endLocation !== undefined) entry.endLocation = endLocation;
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
    try {
      firestoreSyncService.saveTimeEntryToFirestore(entry);
    } catch {}
  }

  stopLiveShift(
    entryId: string,
    endTime: Date,
    breakMinutes: number,
    note: string,
    hourlyRate: number,
    isCustomRate: boolean,
    submitDirectly: boolean,
    endLocation?: GpsLocation | null
  ) {
    const entries = this.getTimeEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    const start = new Date(entry.startTime);
    const totalMinutes = Math.floor((endTime.getTime() - start.getTime()) / (1000 * 60));
    const netMinutes = Math.max(0, totalMinutes - breakMinutes);
    const hours = Math.round((netMinutes / 60) * 100) / 100;
    const total = Math.round(hours * hourlyRate * 100) / 100;

    entry.endTime = endTime.toISOString();
    entry.breakMinutes = breakMinutes;
    entry.hoursWorked = hours;
    entry.hourlyRate = hourlyRate;
    entry.isCustomRate = isCustomRate;
    entry.totalAmount = total;
    entry.note = note.trim();
    entry.status = submitDirectly ? 'pending' : 'draft';
    entry.isRunning = false;
    if (endLocation) {
      entry.endLocation = endLocation;
    }

    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
    try {
      firestoreSyncService.saveTimeEntryToFirestore(entry);
    } catch {}
  }

  createManualShift(entry: Omit<TimeEntry, 'id'>): TimeEntry {
    const newEntry: TimeEntry = {
      ...entry,
      id: 'ent-' + Date.now(),
    };
    const entries = this.getTimeEntries();
    entries.unshift(newEntry);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
    try {
      firestoreSyncService.saveTimeEntryToFirestore(newEntry);
    } catch {}
    return newEntry;
  }

  updateShift(updated: TimeEntry) {
    const entries = this.getTimeEntries().map((e) => (e.id === updated.id ? updated : e));
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    try {
      firestoreSyncService.saveTimeEntryToFirestore(updated);
    } catch {}
    this.notify();
  }

  deleteShift(entryId: string) {
    const entries = this.getTimeEntries().filter((e) => e.id !== entryId);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    try {
      firestoreSyncService.deleteTimeEntryFromFirestore(entryId);
    } catch {}
    this.notify();
  }

  submitDraftForApproval(entryId: string) {
    const entries = this.getTimeEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      entry.status = 'pending';
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
      try {
        firestoreSyncService.saveTimeEntryToFirestore(entry);
      } catch {}
      this.notify();
    }
  }

  approveShift(entryId: string, adminId: string) {
    const entries = this.getTimeEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      entry.status = 'approved';
      entry.approvedBy = adminId;
      entry.approvedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
      try {
        firestoreSyncService.saveTimeEntryToFirestore(entry);
      } catch {}
      this.notify();
    }
  }

  rejectShift(entryId: string, comment: string) {
    const entries = this.getTimeEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      entry.status = 'rejected';
      entry.adminComment = comment.trim();
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
      try {
        firestoreSyncService.saveTimeEntryToFirestore(entry);
      } catch {}
      this.notify();
    }
  }

  batchApproveAll(pendingEntries: TimeEntry[], adminId: string): number {
    const entries = this.getTimeEntries();
    const idsToApprove = new Set(pendingEntries.map((p) => p.id));
    const nowIso = new Date().toISOString();

    let count = 0;
    for (const e of entries) {
      if (idsToApprove.has(e.id)) {
        e.status = 'approved';
        e.approvedBy = adminId;
        e.approvedAt = nowIso;
        count++;
        try {
          firestoreSyncService.saveTimeEntryToFirestore(e);
        } catch {}
      }
    }
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
    return count;
  }

  clearAllEntries() {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify([]));
    this.notify();
  }

  seedChartAnalyticsData() {
    const users = this.getUsers();
    const projects = this.getProjects();
    if (projects.length === 0) return;

    const workerUser = users.find((u) => u.role === 'worker') || users[0];
    const sampleEntries: TimeEntry[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      const proj = projects[i % projects.length];
      const hours = 6.5 + (i % 3) * 1.5;
      const rate = workerUser?.defaultHourlyRate || 200;
      const total = Math.round(hours * rate);

      sampleEntries.push({
        id: 'seed-ent-' + i,
        userId: workerUser?.id || 'user-worker-petr-lukes',
        userName: workerUser?.name || 'Petr Lukeš',
        projectId: proj.id,
        projectName: proj.name,
        date: dateStr,
        startTime: `${dateStr}T07:30:00`,
        endTime: `${dateStr}T15:30:00`,
        breakMinutes: 30,
        hoursWorked: hours,
        hourlyRate: rate,
        isCustomRate: false,
        totalAmount: total,
        note: `Práce na zakázce ${proj.name}`,
        status: i === 0 ? 'pending' : 'approved',
        isRunning: false,
        adminComment: '',
        approvedBy: i === 0 ? null : 'user-boss-marek-dubina',
        approvedAt: i === 0 ? null : new Date().toISOString(),
      });
    }

    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(sampleEntries));
    this.notify();
  }

  // --- Project Photos ---
  getProjectPhotos(projectId?: string): ProjectPhoto[] {
    const raw = localStorage.getItem(STORAGE_KEY_PHOTOS);
    if (!raw) return [];
    try {
      const photos: ProjectPhoto[] = JSON.parse(raw);
      if (projectId) {
        return photos.filter((p) => p.projectId === projectId);
      }
      return photos;
    } catch {
      return [];
    }
  }

  addProjectPhoto(data: Omit<ProjectPhoto, 'id' | 'createdAt'>): ProjectPhoto {
    const photos = this.getProjectPhotos();
    const newPhoto: ProjectPhoto = {
      ...data,
      id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    photos.unshift(newPhoto);
    localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos));
    firestoreSyncService.saveProjectPhotoToFirestore(newPhoto);
    this.notify();
    return newPhoto;
  }

  deleteProjectPhoto(photoId: string) {
    const photos = this.getProjectPhotos().filter((p) => p.id !== photoId);
    localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos));
    firestoreSyncService.deleteProjectPhotoFromFirestore(photoId);
    this.notify();
  }

  async compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Chyba při čtení obrázku.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Chyba při načítání obrázku.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Nelze vytvořit 2D canvas kontext'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- Absences ---
  getAbsences(userId?: string): Absence[] {
    const raw = localStorage.getItem(STORAGE_KEY_ABSENCES);
    if (!raw) return [];
    try {
      const absences: Absence[] = JSON.parse(raw);
      if (userId) {
        return absences.filter((a) => a.userId === userId);
      }
      return absences;
    } catch {
      return [];
    }
  }

  createAbsence(
    data: Omit<Absence, 'id' | 'createdAt' | 'status' | 'approvedBy'>,
    initialStatus: AbsenceStatus = 'pending'
  ): Absence {
    const absences = this.getAbsences();
    const newAbsence: Absence = {
      ...data,
      id: 'abs-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      status: initialStatus,
      createdAt: new Date().toISOString(),
      approvedBy: initialStatus === 'approved' ? 'admin' : null,
    };
    absences.unshift(newAbsence);
    localStorage.setItem(STORAGE_KEY_ABSENCES, JSON.stringify(absences));
    firestoreSyncService.saveAbsenceToFirestore(newAbsence);
    this.notify();
    return newAbsence;
  }

  approveAbsence(absenceId: string, adminId: string) {
    const absences = this.getAbsences();
    const target = absences.find((a) => a.id === absenceId);
    if (target) {
      target.status = 'approved';
      target.approvedBy = adminId;
      localStorage.setItem(STORAGE_KEY_ABSENCES, JSON.stringify(absences));
      firestoreSyncService.saveAbsenceToFirestore(target);
      this.notify();
    }
  }

  rejectAbsence(absenceId: string) {
    const absences = this.getAbsences();
    const target = absences.find((a) => a.id === absenceId);
    if (target) {
      target.status = 'rejected';
      localStorage.setItem(STORAGE_KEY_ABSENCES, JSON.stringify(absences));
      firestoreSyncService.saveAbsenceToFirestore(target);
      this.notify();
    }
  }

  deleteAbsence(absenceId: string) {
    const absences = this.getAbsences().filter((a) => a.id !== absenceId);
    localStorage.setItem(STORAGE_KEY_ABSENCES, JSON.stringify(absences));
    firestoreSyncService.deleteAbsenceFromFirestore(absenceId);
    this.notify();
  }
}

export const storageService = new StorageService();
