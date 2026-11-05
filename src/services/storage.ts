import { AppUser, Project, ProjectStatus, TimeEntry } from '../types';

const STORAGE_KEY_USERS = 'dochazka_users_v2';
const STORAGE_KEY_PROJECTS = 'dochazka_projects_v2';
const STORAGE_KEY_ENTRIES = 'dochazka_entries_v2';
const STORAGE_KEY_CURRENT_USER = 'dochazka_auth_user_v2';

// Reálný výchozí administrátorský účet vlastníka aplikace (založen na reálném e-mailu uživatele)
const OWNER_EMAIL = 'insanebad2@gmail.com';
const OWNER_NAME = 'Správce docházky';

const INITIAL_USERS: AppUser[] = [
  {
    id: 'user-owner',
    name: OWNER_NAME,
    email: OWNER_EMAIL,
    role: 'admin',
    defaultHourlyRate: 350,
    allowCustomRate: true,
    active: true,
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Hlavní zakázka A',
    client: 'Klient 1',
    status: 'open',
    budgetLimitKcz: 100000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    name: 'Servis a údržba',
    client: 'Klient 2',
    status: 'open',
    budgetLimitKcz: 50000,
    createdAt: new Date().toISOString(),
  },
];

class StorageService {
  private listeners: (() => void)[] = [];

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    // Migrace / vyčištění starých vymyšlených dat z v1
    if (localStorage.getItem('dochazka_users_v1')) {
      localStorage.removeItem('dochazka_users_v1');
      localStorage.removeItem('dochazka_projects_v1');
      localStorage.removeItem('dochazka_entries_v1');
      localStorage.removeItem('dochazka_auth_user_v1');
    }

    if (!localStorage.getItem(STORAGE_KEY_USERS)) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEY_PROJECTS)) {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
    }
    if (!localStorage.getItem(STORAGE_KEY_ENTRIES)) {
      // Čistá databáze bez vymyšlených záznamů
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEY_CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Auth / Current User ---
  getCurrentUser(): AppUser | null {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!raw) return null;
    try {
      const u = JSON.parse(raw) as AppUser;
      const all = this.getUsers();
      const fresh = all.find((x) => x.id === u.id);
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

  login(email: string): AppUser | null {
    const users = this.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      this.setCurrentUser(found);
      return found;
    }
    return null;
  }

  register(name: string, email: string, role: 'worker' | 'admin' = 'worker', rate: number = 250): AppUser {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('Uživatel s tímto e-mailem již v systému existuje.');
    }

    // Pokud se registruje vlastník (insanebad2@gmail.com), je automaticky admin
    const isOwner = cleanEmail === OWNER_EMAIL.toLowerCase();

    const newUser: AppUser = {
      id: 'usr-' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      role: isOwner ? 'admin' : role,
      defaultHourlyRate: rate,
      allowCustomRate: isOwner,
      active: true,
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    this.setCurrentUser(newUser);
    this.notify();
    return newUser;
  }

  // --- Users ---
  getUsers(): AppUser[] {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  updateUser(updated: AppUser) {
    const users = this.getUsers().map((u) => (u.id === updated.id ? updated : u));
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    const cur = this.getCurrentUser();
    if (cur && cur.id === updated.id) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updated));
    }
    this.notify();
  }

  addUser(name: string, email: string, role: 'worker' | 'admin', rate: number, allowCustom: boolean): AppUser {
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
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    this.notify();
    return newUser;
  }

  deleteUser(userId: string) {
    const users = this.getUsers().filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    this.notify();
  }

  // --- Projects ---
  getProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
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
    this.notify();
    return newProj;
  }

  toggleProjectStatus(projectId: string): ProjectStatus {
    const projects = this.getProjects();
    let nextStatus: ProjectStatus = 'closed';
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        nextStatus = p.status === 'open' ? 'closed' : 'open';
        return { ...p, status: nextStatus };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
    this.notify();
    return nextStatus;
  }

  deleteProject(projectId: string) {
    const projects = this.getProjects().filter((p) => p.id !== projectId);
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
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

  // Kontrola kolizí směn
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

  startLiveShift(user: AppUser, project: Project): TimeEntry {
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
    };

    const entries = this.getTimeEntries();
    entries.unshift(newEntry);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
    return newEntry;
  }

  stopLiveShift(
    entryId: string,
    endTime: Date,
    breakMinutes: number,
    note: string,
    hourlyRate: number,
    isCustomRate: boolean,
    submitDirectly: boolean
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

    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
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
    return newEntry;
  }

  updateShift(updated: TimeEntry) {
    const entries = this.getTimeEntries().map((e) => (e.id === updated.id ? updated : e));
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
  }

  deleteShift(entryId: string) {
    const entries = this.getTimeEntries().filter((e) => e.id !== entryId);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    this.notify();
  }

  submitDraftForApproval(entryId: string) {
    const entries = this.getTimeEntries();
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      entry.status = 'pending';
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
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

  resetWorkspace() {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(INITIAL_PROJECTS));
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    this.notify();
  }
}

export const storageService = new StorageService();
