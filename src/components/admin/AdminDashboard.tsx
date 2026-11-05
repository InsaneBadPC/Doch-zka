import React, { useState, useEffect } from 'react';
import { Absence, AppUser, Project, TimeEntry } from '../../types';
import { storageService } from '../../services/storage';
import {
  formatDateCz,
  formatHours,
  formatKcz,
  formatMonthDisplay,
  formatTimeFromIso,
  toMonthKey,
} from '../../utils/formatters';
import { copyCsvToClipboard, downloadCsvFile } from '../../utils/csvExporter';
import { WeeklyTrendChart } from './charts/WeeklyTrendChart';
import { BudgetDonutChart } from './charts/BudgetDonutChart';
import { TeamHoursDistribution } from './charts/TeamHoursDistribution';
import { ShareAppModal } from '../common/ShareAppModal';
import { AbsenceCalendar } from '../calendar/AbsenceCalendar';
import { ProjectPhotosModal } from '../projects/ProjectPhotosModal';
import { AdvancedExportModal } from '../export/AdvancedExportModal';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import {
  CheckCheck,
  Check,
  X,
  Plus,
  Briefcase,
  Users,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  UserPlus,
  BarChart3,
  Sparkles,
  RotateCcw,
  TrendingUp,
  ArrowUpRight,
  Send,
  Zap,
  Share2,
  Calendar,
  Camera,
  Eye,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'approvals' | 'projects' | 'users' | 'payroll' | 'calendar'>('analytics');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Modaly
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activePhotoProject, setActivePhotoProject] = useState<Project | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<AppUser | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [rejectingEntry, setRejectingEntry] = useState<TimeEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    const loadData = () => {
      setEntries(storageService.getTimeEntries());
      setProjects(storageService.getProjects());
      setUsers(storageService.getUsers());
      setAbsences(storageService.getAbsences());
    };
    loadData();
    const unsubscribe = storageService.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  const pendingEntries = entries.filter((e) => e.status === 'pending');

  const changeMonth = (delta: number) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1));
  };

  const monthKey = toMonthKey(selectedMonth);

  // --- SCHVALOVÁNÍ ---
  const handleApproveOne = (entry: TimeEntry) => {
    storageService.approveShift(entry.id, currentUser.id);
    showToast(`Směna pracovníka ${entry.userName} byla schválena.`);
  };

  const handleBatchApprove = () => {
    if (pendingEntries.length === 0) return;
    const count = storageService.batchApproveAll(pendingEntries, currentUser.id);
    showToast(`Hromadně schváleno všech ${count} čekajících směn.`);
  };

  const handleRejectConfirm = () => {
    if (!rejectingEntry || !rejectReason.trim()) return;
    storageService.rejectShift(rejectingEntry.id, rejectReason.trim());
    showToast(`Směna byla vrácena pracovníkovi s komentářem.`);
    setRejectingEntry(null);
    setRejectReason('');
  };

  // --- ZAKÁZKY ---
  const handleCreateProject = (name: string, client: string, budget: number) => {
    storageService.createProject(name, client, budget);
    setIsNewProjectModalOpen(false);
    showToast('Nová zakázka byla úspěšně založena.');
  };

  const handleToggleProject = (p: Project) => {
    const next = storageService.toggleProjectStatus(p.id);
    showToast(`Zakázka ${p.name} byla ${next === 'open' ? 'otevřena' : 'uzavřena'}.`);
  };

  // --- UŽIVATELÉ ---
  const handleSaveUser = (u: AppUser) => {
    storageService.updateUser(u);
    setEditingUser(null);
    showToast(`Údaje uživatele ${u.name} byly uloženy.`);
  };

  const handleCreateUser = (
    name: string,
    email: string,
    role: 'worker' | 'admin',
    rate: number,
    allowCustom: boolean,
    password?: string
  ) => {
    try {
      storageService.addUser(name, email, role, rate, allowCustom, password);
      setIsNewUserModalOpen(false);
      showToast(`Účet pro zaměstnance ${name} byl vytvořen.`);
    } catch (err: any) {
      alert(err.message || 'Chyba při zakládání zaměstnance.');
    }
  };

  // --- UZÁVĚRKA ---
  const approvedMonthEntries = entries.filter((e) => e.date.startsWith(monthKey) && e.status === 'approved');

  let totalCompanyPayroll = 0;
  let totalCompanyHours = 0;

  const workerSummaryMap: Record<string, { user: AppUser; hours: number; cost: number; count: number }> = {};
  users.forEach((u) => {
    workerSummaryMap[u.id] = { user: u, hours: 0, cost: 0, count: 0 };
  });

  approvedMonthEntries.forEach((e) => {
    totalCompanyPayroll += e.totalAmount;
    totalCompanyHours += e.hoursWorked;
    if (workerSummaryMap[e.userId]) {
      workerSummaryMap[e.userId].hours += e.hoursWorked;
      workerSummaryMap[e.userId].cost += e.totalAmount;
      workerSummaryMap[e.userId].count += 1;
    }
  });

  const handleCopyCsv = async () => {
    if (approvedMonthEntries.length === 0) {
      showToast('V tomto měsíci nejsou žádné schválené směny pro export.');
      return;
    }
    const ok = await copyCsvToClipboard(approvedMonthEntries);
    if (ok) {
      showToast('CSV výkaz zkopírován do schránky (připraven pro český Excel s oddělovačem ;)');
    } else {
      downloadCsvFile(approvedMonthEntries, `dochazka_${monthKey}.csv`);
      showToast('Výkaz byl stažen jako soubor .csv');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#162016] text-[#D4F73C] px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-[#2B3E2B] animate-in fade-in">
          <Check className="w-4 h-4 stroke-[2.5]" />
          {toastMessage}
        </div>
      )}

      {/* ================= HERO PORTFOLIO BALANCE KARTA (STYL DRONAS FINTECH SCREEN 2) ================= */}
      <div className="bg-[#121513] border border-[#232A23] rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4F73C]/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-slate-400">
                Celkový schválený mzdový fond ({formatMonthDisplay(selectedMonth)})
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1C251C] text-[#D4F73C] border border-[#2B392B]">
                Spark 0 Kč
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="font-mono text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tight">
                {formatKcz(totalCompanyPayroll)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span className="text-[#D4F73C] font-bold flex items-center gap-1 bg-[#1C251C] px-2.5 py-0.5 rounded-full border border-[#2B392B]">
                <TrendingUp className="w-3.5 h-3.5" /> +16.86% efektivita
              </span>
              <span className="text-slate-400">
                Celkem odpracováno: <strong className="text-white">{formatHours(totalCompanyHours)}</strong>
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                Směn ke schválení:{' '}
                <strong className={pendingEntries.length > 0 ? 'text-[#FF5B65]' : 'text-slate-200'}>
                  {pendingEntries.length}
                </strong>
              </span>
            </div>
          </div>

          {/* 5 RYCHLÝCH FINTECH IKON AKCÍ (optimalizováno pro mobily i desktop) */}
          <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#0A0D0B] hover:bg-[#1A221A] border border-[#222922] hover:border-[#D4F73C]/50 transition group"
              title="Založit novou zakázku"
            >
              <div className="w-10 h-10 rounded-xl bg-[#172017] group-hover:bg-[#D4F73C] text-white group-hover:text-black flex items-center justify-center transition">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Nová zakázka</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewUserModalOpen(true)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#0A0D0B] hover:bg-[#1A221A] border border-[#222922] hover:border-[#D4F73C]/50 transition group"
              title="Vytvořit účet zaměstnanci"
            >
              <div className="w-10 h-10 rounded-xl bg-[#172017] group-hover:bg-[#D4F73C] text-white group-hover:text-black flex items-center justify-center transition">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">+ Zaměstnanec</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#0A0D0B] hover:bg-[#1A221A] border border-[#222922] hover:border-[#D4F73C]/50 transition group relative"
              title="Schválit čekající směny"
            >
              <div className="w-10 h-10 rounded-xl bg-[#172017] group-hover:bg-[#D4F73C] text-white group-hover:text-black flex items-center justify-center transition relative">
                <CheckCheck className="w-5 h-5" />
                {pendingEntries.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5B65] text-white text-[9px] font-bold flex items-center justify-center">
                    {pendingEntries.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Schvalování</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#0A0D0B] hover:bg-[#1A221A] border border-[#222922] hover:border-[#D4F73C]/50 transition group"
              title="Pokročilý export dat pro Excel a PDF"
            >
              <div className="w-10 h-10 rounded-xl bg-[#172017] group-hover:bg-[#D4F73C] text-white group-hover:text-black flex items-center justify-center transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Export dat</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#0A0D0B] hover:bg-[#1A221A] border border-[#222922] hover:border-[#D4F73C]/50 transition group"
              title="Sdílet odkaz na aplikaci a APK"
            >
              <div className="w-10 h-10 rounded-xl bg-[#172017] group-hover:bg-[#D4F73C] text-white group-hover:text-black flex items-center justify-center transition">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Sdílet app</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigační lišta záložek šéfa ve stylu fintech pills */}
      <div className="flex items-center justify-between border-b border-[#212721] pb-3">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-[#D4F73C] text-[#090B0A] shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#121513] border border-[#232A23]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Grafy & Analytika</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-[#D4F73C] text-[#090B0A] shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#121513] border border-[#232A23]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Účty zaměstnanců ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'projects'
                ? 'bg-[#D4F73C] text-[#090B0A] shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#121513] border border-[#232A23]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Zakázky ({projects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-[#D4F73C] text-[#090B0A] shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#121513] border border-[#232A23]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Schvalování směn</span>
            {pendingEntries.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'approvals' ? 'bg-black text-[#D4F73C]' : 'bg-[#FF5B65] text-white'
              }`}>
                {pendingEntries.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'bg-[#D4F73C] text-[#090B0A] shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#121513] border border-[#232A23]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalendář absencí</span>
            {(() => {
              const pendingCount = absences.filter((a) => a.status === 'pending').length;
              if (pendingCount === 0) return null;
              return (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-[#FF5B65] text-white">
                  {pendingCount}
                </span>
              );
            })()}
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'payroll'
                ? 'bg-[#D4F73C] text-[#090B0A] shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#121513] border border-[#232A23]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Měsíční uzávěrka</span>
          </button>
        </div>

        {/* Nástroje pro správu dat */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              storageService.seedChartAnalyticsData();
              showToast('Vygenerována data pro zobrazení grafů.');
            }}
            className="text-xs text-[#D4F73C] font-semibold hover:underline flex items-center gap-1 transition font-mono"
            title="Naplnit ukázková data pro otestování grafů"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ukázat v grafech</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm('Chcete smazat záznamy směn a začít s čistým stolem?')) {
                storageService.clearAllEntries();
                showToast('Všechny směny byly vymazány.');
              }
            }}
            className="text-xs text-slate-500 hover:text-slate-200 flex items-center gap-1 transition"
            title="Vyčistit záznamy směn"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Vyčistit</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: GRAFY & ANALYTIKA ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Propracovaný burzovní / svíčkový graf (Weekly Trend) */}
          <WeeklyTrendChart entries={entries} />

          {/* Dva grafy vedle sebe: Rozpočet Donut & Vytížení týmu */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BudgetDonutChart projects={projects} entries={entries} />
            <TeamHoursDistribution users={users} entries={entries} />
          </div>

          {/* SEZNAM ZAKÁZEK VE STYLU FAVORITES (ze screenshotu 2 s mini sparkliny v každém řádku) */}
          <div className="bg-[#121513] border border-[#232A23] rounded-[30px] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E251E] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Sledované zakázky (Portfolio)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Průběžné čerpání rozpočtů s mini výkonovými křivkami
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(true)}
                className="px-3 py-1.5 bg-[#1C251C] hover:bg-[#D4F73C] text-[#D4F73C] hover:text-black font-bold rounded-xl text-xs transition border border-[#2E3C2E] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Přidat zakázku
              </button>
            </div>

            <div className="divide-y divide-[#1B221B]">
              {projects.map((proj) => {
                const projEntries = entries.filter((e) => e.projectId === proj.id && e.status === 'approved');
                const spent = projEntries.reduce((s, e) => s + e.totalAmount, 0);
                const percent = proj.budgetLimitKcz > 0 ? (spent / proj.budgetLimitKcz) * 100 : 0;
                const isOver = spent > proj.budgetLimitKcz && proj.budgetLimitKcz > 0;

                // Vytvoříme malý mini sparkline graf (jako u Netflix/McDonalds na obrázku)
                const sparklinePoints = [3, 5, 4, 7, 6, 8, percent > 80 ? 9 : 6];

                return (
                  <div
                    key={proj.id}
                    className="py-4 flex items-center justify-between gap-4 hover:bg-[#161B16] px-3 rounded-2xl transition"
                  >
                    {/* Ikona + Název zakázky */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#1C251C] border border-[#2A372A] text-[#D4F73C] font-black flex items-center justify-center shrink-0">
                        {proj.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{proj.name}</div>
                        <div className="text-xs text-slate-400 truncate">{proj.client}</div>
                      </div>
                    </div>

                    {/* Mini sparkline graf v řádku ze screenshotu! */}
                    <div className="hidden sm:block w-24 h-6">
                      <svg className="w-full h-full overflow-visible">
                        <polyline
                          fill="none"
                          stroke={isOver ? '#FF5B65' : '#D4F73C'}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={sparklinePoints.map((v, i) => `${i * 15},${22 - v * 2}`).join(' ')}
                        />
                      </svg>
                    </div>

                    {/* Částka a procentuální badge */}
                    <div className="text-right font-mono shrink-0">
                      <div className="font-extrabold text-white text-sm">
                        {formatKcz(spent)}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[11px] font-bold">
                        <span className={isOver ? 'text-[#FF5B65]' : 'text-[#D4F73C]'}>
                          {isOver ? `! +${(spent - proj.budgetLimitKcz).toLocaleString('cs-CZ')} Kč` : `${percent.toFixed(1)} % rozpočtu`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SPRÁVA ÚČTŮ ZAMĚSTNANCŮ ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121513] border border-[#232A23] rounded-[30px] p-6 shadow-xl">
            <div>
              <h2 className="text-base font-extrabold text-white">
                Správa zaměstnanců & Tvorba firemních účtů
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Zakládejte účty pracovníkům, nastavujte hodinové mzdy a práva na úpravu sazeb
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewUserModalOpen(true)}
              className="px-4 py-2.5 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-[#D4F73C]/20"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" /> Vytvořit účet zaměstnanci
            </button>
          </div>

          <div className="bg-[#121513] border border-[#232A23] rounded-[30px] overflow-hidden shadow-xl divide-y divide-[#1C231C]">
            {users.map((u) => {
              const uMonthEntries = entries.filter(
                (e) => e.userId === u.id && e.date.startsWith(monthKey) && e.status === 'approved'
              );
              let uMonthEarned = 0;
              let uMonthHours = 0;
              uMonthEntries.forEach((e) => {
                uMonthEarned += e.totalAmount;
                uMonthHours += e.hoursWorked;
              });

              return (
                <div
                  key={u.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#171D17] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#1C251C] border border-[#2A372A] text-[#D4F73C] font-mono font-bold flex items-center justify-center text-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-white text-base">{u.name}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs font-mono text-slate-400">{u.email}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs font-semibold text-[#D4F73C]">
                          {u.role === 'admin' ? 'Administrátor (šéf)' : 'Zaměstnanec'}
                        </span>
                        {!u.active && (
                          <span className="text-xs font-bold text-[#FF5B65] bg-[#2A1516] px-2 py-0.5 rounded-md">
                            Účet deaktivován
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-5 gap-y-1 font-mono">
                        <span>Sazba: <strong className="text-white">{formatKcz(u.defaultHourlyRate)}/h</strong></span>
                        <span>Vlastní sazba u směn: <strong className="text-slate-300">{u.allowCustomRate ? 'Povolena' : 'Zakázána'}</strong></span>
                        <span>
                          Měsíční výdělek: <strong className="text-[#D4F73C]">{formatKcz(uMonthEarned)}</strong> ({formatHours(uMonthHours)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDetailEmployee(u)}
                      className="px-3.5 py-2 text-xs text-black bg-[#D4F73C] hover:bg-[#c2e232] rounded-xl transition flex items-center gap-1.5 font-bold shadow-[0_0_12px_rgba(212,247,60,0.2)]"
                      title="Zobrazit detail odpracovaných hodin, zakázek a absencí"
                    >
                      <Eye className="w-3.5 h-3.5" /> Detail hodin & zakázek
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="px-3.5 py-2 text-xs text-slate-200 hover:text-white bg-[#1A221A] hover:bg-[#253225] border border-[#2A372A] rounded-xl transition flex items-center gap-1.5 font-semibold"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#D4F73C]" /> Upravit účet
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Opravdu chcete odebrat účet zaměstnance ${u.name}?`)) {
                            storageService.deleteUser(u.id);
                            showToast(`Účet ${u.name} byl smazán.`);
                          }
                        }}
                        className="p-2 text-slate-500 hover:text-[#FF5B65] transition rounded-lg"
                        title="Smazat účet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: ZAKÁZKY ================= */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Evidence zakázek & Mzdové rozpočty
              </h2>
              <p className="text-xs text-slate-400">Zakládejte projekty a kontrolujte mzdový limit</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(true)}
              className="px-4 py-2 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-2xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-[#D4F73C]/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Založit zakázku
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const projEntries = entries.filter((e) => e.projectId === proj.id);

              let approvedCost = 0;
              let approvedHours = 0;
              const workerMap: Record<string, { name: string; hours: number; cost: number }> = {};

              projEntries.forEach((e) => {
                if (e.status === 'approved') {
                  approvedCost += e.totalAmount;
                  approvedHours += e.hoursWorked;
                  if (!workerMap[e.userId]) {
                    workerMap[e.userId] = { name: e.userName, hours: 0, cost: 0 };
                  }
                  workerMap[e.userId].hours += e.hoursWorked;
                  workerMap[e.userId].cost += e.totalAmount;
                }
              });

              const budget = proj.budgetLimitKcz;
              const percent = budget > 0 ? (approvedCost / budget) * 100 : 0;
              const isOver = approvedCost > budget && budget > 0;

              return (
                <div
                  key={proj.id}
                  className="bg-[#121513] border border-[#232A23] rounded-[30px] p-6 space-y-4 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-white text-base">{proj.name}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">Klient: {proj.client}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleProject(proj)}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#1A221A] border border-[#2A372A] hover:border-[#D4F73C] text-slate-300 transition flex items-center gap-1 shrink-0"
                      >
                        {proj.status === 'open' ? (
                          <>
                            <Lock className="w-3 h-3 text-slate-400" /> Uzavřít
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-[#D4F73C]" /> Otevřít
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-[#0A0D0B] p-4 rounded-2xl border border-[#222922] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          {formatKcz(approvedCost)} / {formatKcz(budget)}
                        </span>
                        <span className={`font-bold ${isOver ? 'text-[#FF5B65]' : 'text-[#D4F73C]'}`}>
                          {percent.toFixed(1)} %
                        </span>
                      </div>

                      <div className="w-full bg-[#182018] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOver ? 'bg-[#FF5B65]' : percent > 85 ? 'bg-amber-400' : 'bg-[#D4F73C]'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>

                      {isOver && (
                        <div className="text-xs font-semibold text-[#FF5B65] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Rozpočet překročen o {formatKcz(approvedCost - budget)}!
                        </div>
                      )}
                    </div>
                  </div>

                  {Object.keys(workerMap).length > 0 && (
                    <div className="pt-2 border-t border-[#1E251E]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                        Mzdy dle pracovníků na zakázce:
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        {Object.values(workerMap).map((w, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-400">
                            <span className="font-sans text-white">{w.name}</span>
                            <span>{formatHours(w.hours)} · {formatKcz(w.cost)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fotodokumentace náhled přímo na kartě zakázky */}
                  {(() => {
                    const projPhotos = storageService.getProjectPhotos(proj.id);
                    return (
                      <div className="pt-3 border-t border-[#1E251E] space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#D4F73C]" />
                            Fotodokumentace zakázky
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {projPhotos.length === 0 ? '0 fotek' : `${projPhotos.length} snímků`}
                          </span>
                        </div>

                        {projPhotos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {projPhotos.slice(0, 3).map((ph) => (
                              <div
                                key={ph.id}
                                onClick={() => setActivePhotoProject(proj)}
                                className="aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5 cursor-pointer hover:border-[#D4F73C] transition group relative"
                              >
                                <img src={ph.photoData} alt={ph.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-[#0A0D0B] border border-white/5 text-[11px] text-slate-500 italic text-center">
                            Zatím žádné fotografie. Přidejte první snímek ze stavby.
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setActivePhotoProject(proj)}
                          className="w-full py-2 px-3 bg-[#1A221A] hover:bg-[#D4F73C] text-slate-200 hover:text-black font-bold text-xs rounded-xl border border-[#2A372A] transition-colors flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{projPhotos.length > 0 ? `Otevřít galerii & nahrát (${projPhotos.length})` : 'Nahrát fotku ze stavby'}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 4: SCHVALOVACÍ CENTRUM ================= */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121513] border border-[#232A23] rounded-[30px] p-6 shadow-xl">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Fronta ke schválení</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                Čeká <span className="font-mono text-[#D4F73C] font-black">{pendingEntries.length} směn</span> od pracovníků ke kontrole.
              </div>
            </div>

            {pendingEntries.length > 0 && (
              <button
                type="button"
                onClick={handleBatchApprove}
                className="px-4 py-2.5 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#D4F73C]/20"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                Hromadně schválit vše ({pendingEntries.length})
              </button>
            )}
          </div>

          {pendingEntries.length === 0 ? (
            <div className="bg-[#121513] border border-[#232A23] rounded-[30px] p-8 sm:p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#1C251C] text-[#D4F73C] mx-auto flex items-center justify-center mb-3">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Všechny směny jsou zkontrolovány</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Aktuálně nečeká žádná směna na vaše schválení. Jakmile pracovník odešle směnu, objeví se v této frontě.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingEntries.map((entry) => {
                const isOvertime = entry.hoursWorked > 12;

                return (
                  <div
                    key={entry.id}
                    className="bg-[#121513] border border-[#232A23] rounded-[28px] p-5 space-y-3 shadow-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-white text-base">{entry.userName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Zakázka: <strong className="text-white">{entry.projectName}</strong>
                          <span className="mx-1.5">·</span>
                          {formatDateCz(entry.date)}
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="font-mono text-xl font-black text-[#D4F73C] tabular-nums">
                          {formatKcz(entry.totalAmount)}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {formatHours(entry.hoursWorked)} × {formatKcz(entry.hourlyRate)}/h
                        </div>
                      </div>
                    </div>

                    {(entry.isCustomRate || isOvertime) && (
                      <div className="flex flex-wrap gap-4 text-xs pt-1 border-t border-[#1E251E]">
                        {entry.isCustomRate && (
                          <div className="text-[#D4F73C] font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Upravená sazba: {formatKcz(entry.hourlyRate)}/h
                          </div>
                        )}
                        {isOvertime && (
                          <div className="text-[#FF5B65] font-semibold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Směna přes 12 hodin ({formatHours(entry.hoursWorked)})
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-slate-400 font-mono">
                      Pracovní doba: {formatTimeFromIso(entry.startTime)} – {formatTimeFromIso(entry.endTime)}
                      {entry.breakMinutes > 0 && <span> (pauza {entry.breakMinutes} min)</span>}
                    </div>

                    {entry.note && (
                      <div className="text-xs text-slate-300 italic bg-[#0A0D0B] p-3 rounded-xl border border-[#222922]">
                        „{entry.note}“
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E251E]">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingEntry(entry);
                          setRejectReason('');
                        }}
                        className="px-3.5 py-2 text-xs font-semibold text-[#FF5B65] hover:bg-[#2A1516] rounded-xl transition border border-[#3A1E20] flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Vrátit k opravě
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveOne(entry)}
                        className="px-4 py-2 text-xs font-extrabold text-[#090B0A] bg-[#D4F73C] hover:bg-[#c4e92a] rounded-xl transition flex items-center gap-1.5 shadow-md shadow-[#D4F73C]/20"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Schválit směnu
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 5: UZÁVĚRKA A CSV EXPORT ================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#121513] border border-[#232A23] rounded-[30px] p-4 shadow-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A221A] transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm text-white min-w-[140px] text-center">
                {formatMonthDisplay(selectedMonth)}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A221A] transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyCsv}
                className="px-4 py-2 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-2xl text-xs flex items-center gap-2 transition shadow-md shadow-[#D4F73C]/20"
              >
                <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                Zkopírovat CSV (středník ;)
              </button>
              <button
                type="button"
                onClick={() => downloadCsvFile(approvedMonthEntries, `dochazka_${monthKey}.csv`)}
                className="px-3.5 py-2 bg-[#1A221A] hover:bg-[#253225] text-slate-300 font-semibold rounded-2xl text-xs flex items-center gap-1.5 transition border border-[#2A372A]"
              >
                <Download className="w-3.5 h-3.5" />
                Stáhnout .csv
              </button>
            </div>
          </div>

          <div className="bg-[#121513] border border-[#232A23] rounded-[30px] p-6 sm:p-8 shadow-xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Celková schválená suma k vyplacení
            </div>
            <div className="text-3xl sm:text-5xl font-black text-white font-mono tabular-nums">
              {formatKcz(totalCompanyPayroll)}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Odpracováno {formatHours(totalCompanyHours)} v celkem {approvedMonthEntries.length} schválených směnách.
            </div>
          </div>

          {/* Rozpis po pracovnících */}
          <div className="bg-[#121513] border border-[#232A23] rounded-[30px] overflow-hidden shadow-xl divide-y divide-[#1C231C]">
            {Object.values(workerSummaryMap).map(({ user, hours, cost, count }) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between hover:bg-[#161D16] transition"
              >
                <div>
                  <div className="font-extrabold text-white text-sm">{user.name}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {count} schválených směn · {formatHours(hours)}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-base text-[#D4F73C]">{formatKcz(cost)}</div>
                  <div className="text-[11px] text-slate-500">{formatKcz(user.defaultHourlyRate)}/h základ</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Vrácení směny k opravě */}
      {rejectingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121513] border border-[#232A23] rounded-[30px] p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-[#FF5B65] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Vrátit směnu k opravě
            </h3>
            <p className="text-xs text-slate-300">
              Pracovník: <strong className="text-white">{rejectingEntry.userName}</strong>
              <br />
              Zakázka: {rejectingEntry.projectName} ({formatDateCz(rejectingEntry.date)})
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Důvod vrácení (komentář pro pracovníka) *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Popište, co je potřeba na směně opravit..."
                className="w-full px-3.5 py-2.5 bg-[#0A0D0B] border border-[#232A23] rounded-2xl text-white text-sm focus:outline-none focus:border-[#FF5B65] placeholder-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E251E]">
              <button
                type="button"
                onClick={() => setRejectingEntry(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Zrušit
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={handleRejectConfirm}
                className="px-4 py-2 bg-[#FF5B65] hover:bg-[#e44c56] disabled:opacity-40 text-white rounded-xl text-xs font-bold"
              >
                Vrátit směnu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Založit zakázku */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121513] border border-[#232A23] rounded-[30px] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#D4F73C]" /> Založit novou zakázku
            </h3>
            <CreateProjectForm
              onClose={() => setIsNewProjectModalOpen(false)}
              onSubmit={handleCreateProject}
            />
          </div>
        </div>
      )}

      {/* Modal: Vytvořit nový účet zaměstnance */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121513] border border-[#232A23] rounded-[30px] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#D4F73C]" /> Vytvořit nový účet zaměstnance
            </h3>
            <CreateUserForm
              onClose={() => setIsNewUserModalOpen(false)}
              onSubmit={handleCreateUser}
            />
          </div>
        </div>
      )}

      {/* Modal: Upravit zaměstnance */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121513] border border-[#232A23] rounded-[30px] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#D4F73C]" /> Úprava účtu: {editingUser.name}
            </h3>
            <EditUserForm
              user={editingUser}
              onClose={() => setEditingUser(null)}
              onSubmit={handleSaveUser}
            />
          </div>
        </div>
      )}

      {/* ================= TAB 6: KALENDÁŘ ABSENCÍ & ŽÁDOSTÍ O VOLNO ================= */}
      {activeTab === 'calendar' && (
        <AbsenceCalendar currentUser={currentUser} allUsers={users} />
      )}

      {/* Modal pro sdílení aplikace a APK */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Modal fotodokumentace zakázky */}
      {activePhotoProject && (
        <ProjectPhotosModal
          project={activePhotoProject}
          currentUser={currentUser}
          onClose={() => setActivePhotoProject(null)}
        />
      )}

      {/* Modal detailu zaměstnance */}
      {detailEmployee && (
        <EmployeeDetailModal
          employee={detailEmployee}
          entries={entries}
          projects={projects}
          absences={absences}
          onClose={() => setDetailEmployee(null)}
          onScheduleAbsence={() => {
            setDetailEmployee(null);
            setActiveTab('calendar');
          }}
        />
      )}

      {/* Modal pro pokročilý export */}
      {isExportModalOpen && (
        <AdvancedExportModal
          currentUser={currentUser}
          allUsers={users}
          projects={projects}
          entries={entries}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};

const CreateProjectForm: React.FC<{
  onClose: () => void;
  onSubmit: (name: string, client: string, budget: number) => void;
}> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [budget, setBudget] = useState(60000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !client.trim()) return;
    onSubmit(name, client, budget);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Název zakázky *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="např. Výstavba výrobní haly B"
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Zákazník / Firma *</label>
        <input
          type="text"
          required
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="např. StavTech s.r.o."
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Mzdový rozpočet (Kč) *</label>
        <input
          type="number"
          required
          min={1000}
          step={1000}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm font-mono focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#1E251E]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          Zrušit
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-xl text-xs transition"
        >
          Založit zakázku
        </button>
      </div>
    </form>
  );
};

const CreateUserForm: React.FC<{
  onClose: () => void;
  onSubmit: (
    name: string,
    email: string,
    role: 'worker' | 'admin',
    rate: number,
    allowCustom: boolean,
    password?: string
  ) => void;
}> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'worker' | 'admin'>('worker');
  const [rate, setRate] = useState(250);
  const [allowCustom, setAllowCustom] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes('@')) return;
    onSubmit(name, email, role, rate, allowCustom, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Jméno a příjmení zaměstnance *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="např. Martin Kovář"
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Přihlašovací e-mail *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="martin.kovar@firma.cz"
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm font-mono focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Přihlašovací heslo *</label>
        <input
          type="text"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nastavte heslo pro zaměstnance"
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm font-mono focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Systémová role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full px-3.5 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-xs focus:outline-none"
          >
            <option value="worker">Zaměstnanec (pracovník)</option>
            <option value="admin">Administrátor (vedoucí)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Základní sazba (Kč/h)</label>
          <input
            type="number"
            min={50}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full px-3.5 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-xs font-mono focus:outline-none"
          />
        </div>
      </div>

      <div className="pt-1">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={allowCustom}
            onChange={(e) => setAllowCustom(e.target.checked)}
            className="w-4 h-4 rounded text-[#D4F73C] bg-[#0A0D0B] border-[#232A23]"
          />
          <span>Povolit zaměstnanci upravovat sazbu u jednotlivých směn</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#1E251E]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          Zrušit
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-xl text-xs transition"
        >
          Vytvořit účet
        </button>
      </div>
    </form>
  );
};

const EditUserForm: React.FC<{
  user: AppUser;
  onClose: () => void;
  onSubmit: (u: AppUser) => void;
}> = ({ user, onClose, onSubmit }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password || '');
  const [rate, setRate] = useState(user.defaultHourlyRate);
  const [allowCustom, setAllowCustom] = useState(user.allowCustomRate);
  const [active, setActive] = useState(user.active);
  const [role, setRole] = useState(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...user,
      name: name.trim(),
      email: email.trim(),
      password: password.trim() || user.password,
      defaultHourlyRate: rate,
      allowCustomRate: allowCustom,
      active,
      role,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Jméno a příjmení</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] rounded-2xl text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Přihlašovací e-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] rounded-2xl text-white text-sm font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Heslo zaměstnance</label>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Zadejte nové heslo"
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] rounded-2xl text-white text-sm font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Hodinová sazba (Kč/h)</label>
        <input
          type="number"
          min={50}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] rounded-2xl text-white text-sm font-mono"
        />
      </div>

      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={allowCustom}
            onChange={(e) => setAllowCustom(e.target.checked)}
            className="w-4 h-4 rounded text-[#D4F73C] bg-[#0A0D0B] border-[#232A23]"
          />
          <span>Povolit přepisovat sazbu u jednotlivých směn</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded text-[#D4F73C] bg-[#0A0D0B] border-[#232A23]"
          />
          <span>Aktivní účet (při odškrtnutí zablokuje přístup do systému)</span>
        </label>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">Role v aplikaci</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] rounded-2xl text-white text-xs"
        >
          <option value="worker">Zaměstnanec (pracovník)</option>
          <option value="admin">Administrátor (šéf)</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[#1E251E]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          Zrušit
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-xl text-xs transition"
        >
          Uložit změny
        </button>
      </div>
    </form>
  );
};
