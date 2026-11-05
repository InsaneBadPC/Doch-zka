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
  createdAt: string; // ISO-8601
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
}
