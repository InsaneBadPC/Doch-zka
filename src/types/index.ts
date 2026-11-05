export type UserRole = 'worker' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  defaultHourlyRate: number; // in CZK
  allowCustomRate: boolean;
  active: boolean;
}

export type ProjectStatus = 'open' | 'closed';

export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  budgetLimitKcz: number;
  photos?: string[];
  photosCount?: number;
  createdAt: string; // ISO-8601
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number; // v metrech
  timestamp?: string; // ISO-8601
  address?: string; // Textová adresa nebo název města
}

export type ShiftStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO-8601
  endTime: string | null; // ISO-8601 or null if running
  breakMinutes: number;
  hoursWorked: number;
  hourlyRate: number;
  isCustomRate: boolean;
  totalAmount: number;
  note: string;
  status: ShiftStatus;
  isRunning: boolean;
  adminComment: string;
  approvedBy: string | null;
  approvedAt: string | null;
  startLocation?: GpsLocation | null;
  endLocation?: GpsLocation | null;
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  photoData: string; // compressed base64 data URI
  caption: string;
  createdAt: string; // ISO-8601
}

export type AbsenceType = 'vacation' | 'doctor' | 'sick' | 'personal';
export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

export interface Absence {
  id: string;
  userId: string;
  userName: string;
  type: AbsenceType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isFullDay: boolean;
  startTime?: string; // HH:mm if not full day
  endTime?: string; // HH:mm if not full day
  note: string;
  status: AbsenceStatus;
  createdAt: string;
  approvedBy: string | null;
}

export interface ExportColumnOptions {
  date: boolean;
  worker: boolean;
  project: boolean;
  time: boolean;
  breakMins: boolean;
  hours: boolean;
  rate: boolean;
  total: boolean;
  note: boolean;
  status: boolean;
  startGps?: boolean;
  endGps?: boolean;
}

