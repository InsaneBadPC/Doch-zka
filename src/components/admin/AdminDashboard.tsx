import React, { useState, useEffect } from 'react';
import { AppUser, Project, TimeEntry } from '../../types';
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
  RotateCcw,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'projects' | 'users' | 'payroll'>('approvals');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Modaly
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [rejectingEntry, setRejectingEntry] = useState<TimeEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const loadData = () => {
      setEntries(storageService.getTimeEntries());
      setProjects(storageService.getProjects());
      setUsers(storageService.getUsers());
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

  // --- ZÁLOŽKA 1: SCHVALOVÁNÍ SMĚN ---
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

  // --- ZÁLOŽKA 2: ZAKÁZKY ---
  const handleCreateProject = (name: string, client: string, budget: number) => {
    storageService.createProject(name, client, budget);
    setIsNewProjectModalOpen(false);
    showToast('Nová zakázka byla úspěšně založena.');
  };

  const handleToggleProject = (p: Project) => {
    const next = storageService.toggleProjectStatus(p.id);
    showToast(`Zakázka ${p.name} byla ${next === 'open' ? 'otevřena' : 'uzavřena'}.`);
  };

  // --- ZÁLOŽKA 3: LIDÉ ---
  const handleSaveUser = (u: AppUser) => {
    storageService.updateUser(u);
    setEditingUser(null);
    showToast(`Údaje uživatele ${u.name} byly uloženy.`);
  };

  const handleCreateUser = (name: string, email: string, role: 'worker' | 'admin', rate: number, allowCustom: boolean) => {
    try {
      storageService.addUser(name, email, role, rate, allowCustom);
      setIsNewUserModalOpen(false);
      showToast(`Pracovník ${name} byl úspěšně přidán.`);
    } catch (err: any) {
      alert(err.message || 'Chyba při zakládání pracovníka.');
    }
  };

  // --- ZÁLOŽKA 4: UZÁVĚRKA ---
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
      showToast('CSV výkaz zkopírován do schránky (připraven pro český Excel).');
    } else {
      downloadCsvFile(approvedMonthEntries, `dochazka_${monthKey}.csv`);
      showToast('Výkaz byl stažen jako soubor .csv');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-emerald-400 animate-in fade-in">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* 4-Tab Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ke schválení</span>
            {pendingEntries.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                activeTab === 'approvals'
                  ? 'bg-amber-400 text-slate-950 dark:bg-slate-950 dark:text-amber-400'
                  : 'bg-amber-500 text-slate-950'
              }`}>
                {pendingEntries.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'projects'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Zakázky ({projects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lidé & Sazby ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'payroll'
                ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Měsíční uzávěrka</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('Chcete smazat všechny záznamy docházky a začít s čistým stolem?')) {
              storageService.clearAllEntries();
              showToast('Všechny směny byly vymazány.');
            }
          }}
          className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition"
          title="Vyčistit záznamy směn"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Vyčistit historii</span>
        </button>
      </div>

      {/* ================= TAB 1: KE SCHVÁLENÍ ================= */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Fronta ke schválení</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                Čeká <span className="font-mono text-amber-500">{pendingEntries.length} směn</span> od pracovníků ke kontrole.
              </div>
            </div>

            {pendingEntries.length > 0 && (
              <button
                type="button"
                onClick={handleBatchApprove}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <CheckCheck className="w-4 h-4" />
                Hromadně schválit vše ({pendingEntries.length})
              </button>
            )}
          </div>

          {pendingEntries.length === 0 ? (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Vše je schváleno</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
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
                    className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-base">{entry.userName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Zakázka: <strong className="text-slate-800 dark:text-slate-200">{entry.projectName}</strong>
                          <span className="mx-1.5">·</span>
                          {formatDateCz(entry.date)}
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatKcz(entry.totalAmount)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {formatHours(entry.hoursWorked)} × {formatKcz(entry.hourlyRate)}/h
                        </div>
                      </div>
                    </div>

                    {(entry.isCustomRate || isOvertime) && (
                      <div className="flex flex-wrap gap-4 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        {entry.isCustomRate && (
                          <div className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Upravená sazba: {formatKcz(entry.hourlyRate)}/h
                          </div>
                        )}
                        {isOvertime && (
                          <div className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Směna přes 12 hodin ({formatHours(entry.hoursWorked)})
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Pracovní doba: {formatTimeFromIso(entry.startTime)} – {formatTimeFromIso(entry.endTime)}
                      {entry.breakMinutes > 0 && <span> (pauza {entry.breakMinutes} min)</span>}
                    </div>

                    {entry.note && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-[#090d16] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        „{entry.note}“
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingEntry(entry);
                          setRejectReason('');
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition border border-red-200 dark:border-red-900/60 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Vrátit k opravě
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveOne(entry)}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <Check className="w-3.5 h-3.5" /> Schválit směnu
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ZAKÁZKY ================= */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Zakázky & Mzdové rozpočty
              </h2>
              <p className="text-xs text-slate-400">Řízení rentability a nákladů na jednotlivých zakázkách</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Přidat novou zakázku
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const projEntries = entries.filter((e) => e.projectId === proj.id);

              let approvedCost = 0;
              let approvedHours = 0;
              let pendingCost = 0;
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
                } else if (e.status === 'pending') {
                  pendingCost += e.totalAmount;
                }
              });

              const budget = proj.budgetLimitKcz;
              const percent = budget > 0 ? (approvedCost / budget) * 100 : 0;
              const isOver = approvedCost > budget && budget > 0;

              return (
                <div
                  key={proj.id}
                  className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{proj.name}</h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Klient: {proj.client}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleProject(proj)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1 shrink-0"
                      >
                        {proj.status === 'open' ? (
                          <>
                            <Lock className="w-3 h-3 text-slate-400" /> Uzavřít
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-emerald-500" /> Otevřít
                          </>
                        )}
                      </button>
                    </div>

                    {/* Čerpání rozpočtu */}
                    <div className="bg-slate-50 dark:bg-[#090d16] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500 dark:text-slate-400">
                          {formatKcz(approvedCost)} / {formatKcz(budget)}
                        </span>
                        <span className={`font-bold ${isOver ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {percent.toFixed(1)} %
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOver ? 'bg-red-500' : percent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        ></div>
                      </div>

                      {isOver && (
                        <div className="text-xs font-semibold text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Rozpočet překročen o {formatKcz(approvedCost - budget)}!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rozpad nákladů */}
                  {Object.keys(workerMap).length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Náklady dle pracovníků:
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        {Object.values(workerMap).map((w, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span className="font-sans">{w.name}</span>
                            <span>{formatHours(w.hours)} · {formatKcz(w.cost)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: LIDÉ ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tým a Hodinové Sazby
              </h2>
              <p className="text-xs text-slate-400">Správa pracovníků, oprávnění a mzdových sazeb</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewUserModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <UserPlus className="w-3.5 h-3.5" /> Přidat pracovníka
            </button>
          </div>

          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
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
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{u.name}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{u.email}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {u.role === 'admin' ? 'Administrátor' : 'Pracovník'}
                      </span>
                      {!u.active && (
                        <span className="text-xs font-bold text-red-500">[BLOKOVÁN]</span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                      <span>Sazba: <strong className="text-slate-800 dark:text-slate-200">{formatKcz(u.defaultHourlyRate)}/h</strong></span>
                      <span>Vlastní sazba: {u.allowCustomRate ? 'Povolena' : 'Zakázána'}</span>
                      <span>
                        Tento měsíc: <strong className="text-emerald-600 dark:text-emerald-400">{formatKcz(uMonthEarned)}</strong> ({formatHours(uMonthHours)})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg transition flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Upravit
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Opravdu chcete odebrat pracovníka ${u.name}?`)) {
                            storageService.deleteUser(u.id);
                            showToast(`Pracovník ${u.name} byl odebrán.`);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition"
                        title="Odebrat"
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

      {/* ================= TAB 4: UZÁVĚRKA A CSV EXPORT ================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm text-slate-900 dark:text-white min-w-[140px] text-center">
                {formatMonthDisplay(selectedMonth)}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyCsv}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-md shadow-emerald-600/20"
              >
                <Copy className="w-3.5 h-3.5" />
                Zkopírovat CSV pro Excel (středník ;)
              </button>
              <button
                type="button"
                onClick={() => downloadCsvFile(approvedMonthEntries, `dochazka_${monthKey}.csv`)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Stáhnout .csv
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Celková schválená suma k výplatě
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                {formatKcz(totalCompanyPayroll)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                Odpracováno {formatHours(totalCompanyHours)} v celkem {approvedMonthEntries.length} schválených směnách.
              </div>
            </div>
          </div>

          {/* Rozpis po pracovnících */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {Object.values(workerSummaryMap).map(({ user, hours, cost, count }) => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {count} schválených směn · {formatHours(hours)}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-base text-emerald-600 dark:text-emerald-400">{formatKcz(cost)}</div>
                  <div className="text-[11px] text-slate-400">{formatKcz(user.defaultHourlyRate)}/h základ</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Vrácení směny k opravě */}
      {rejectingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Vrátit směnu k opravě
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Pracovník: <strong className="text-slate-900 dark:text-white">{rejectingEntry.userName}</strong>
              <br />
              Zakázka: {rejectingEntry.projectName} ({formatDateCz(rejectingEntry.date)})
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Důvod vrácení (komentář pro pracovníka) *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Popište, co je potřeba na směně opravit..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingEntry(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Zrušit
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={handleRejectConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold"
              >
                Vrátit směnu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Založit zakázku */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-500" /> Založit novou zakázku
            </h3>
            <CreateProjectForm
              onClose={() => setIsNewProjectModalOpen(false)}
              onSubmit={handleCreateProject}
            />
          </div>
        </div>
      )}

      {/* Modal: Přidat pracovníka */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-500" /> Přidat nového pracovníka
            </h3>
            <CreateUserForm
              onClose={() => setIsNewUserModalOpen(false)}
              onSubmit={handleCreateUser}
            />
          </div>
        </div>
      )}

      {/* Modal: Upravit pracovníka */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-500" /> Úprava pracovníka: {editingUser.name}
            </h3>
            <EditUserForm
              user={editingUser}
              onClose={() => setEditingUser(null)}
              onSubmit={handleSaveUser}
            />
          </div>
        </div>
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
  const [budget, setBudget] = useState(50000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !client.trim()) return;
    onSubmit(name, client, budget);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Název zakázky *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="např. Výstavba výrobní haly B"
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Zákazník / Firma *</label>
        <input
          type="text"
          required
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="např. StavTech s.r.o."
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mzdový rozpočet (Kč) *</label>
        <input
          type="number"
          required
          min={1000}
          step={1000}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm font-mono focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          Zrušit
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl text-xs"
        >
          Založit zakázku
        </button>
      </div>
    </form>
  );
};

const CreateUserForm: React.FC<{
  onClose: () => void;
  onSubmit: (name: string, email: string, role: 'worker' | 'admin', rate: number, allowCustom: boolean) => void;
}> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'worker' | 'admin'>('worker');
  const [rate, setRate] = useState(250);
  const [allowCustom, setAllowCustom] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.includes('@')) return;
    onSubmit(name, email, role, rate, allowCustom);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jméno a příjmení *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="např. Karel Novák"
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">E-mail *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="karel@firma.cz"
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm font-mono focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none"
          >
            <option value="worker">Pracovník</option>
            <option value="admin">Administrátor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hodinová sazba (Kč)</label>
          <input
            type="number"
            min={50}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm font-mono focus:outline-none"
          />
        </div>
      </div>

      <div className="pt-1">
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={allowCustom}
            onChange={(e) => setAllowCustom(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 bg-slate-50 dark:bg-[#090d16] border-slate-300 dark:border-slate-800"
          />
          <span>Povolit pracovníkovi přepisovat sazbu u směny</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          Zrušit
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl text-xs"
        >
          Přidat pracovníka
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
  const [rate, setRate] = useState(user.defaultHourlyRate);
  const [allowCustom, setAllowCustom] = useState(user.allowCustomRate);
  const [active, setActive] = useState(user.active);
  const [role, setRole] = useState(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...user,
      name: name.trim(),
      defaultHourlyRate: rate,
      allowCustomRate: allowCustom,
      active,
      role,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jméno a příjmení</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Základní hodinová sazba (Kč/h)</label>
        <input
          type="number"
          min={50}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm font-mono"
        />
      </div>

      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={allowCustom}
            onChange={(e) => setAllowCustom(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 bg-slate-50 dark:bg-[#090d16] border-slate-300 dark:border-slate-800"
          />
          <span>Povolit přepisovat sazbu u jednotlivých směn</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-500 bg-slate-50 dark:bg-[#090d16] border-slate-300 dark:border-slate-800"
          />
          <span>Aktivní účet (při vypnutí zablokuje přístup do systému)</span>
        </label>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role v aplikaci</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm"
        >
          <option value="worker">Pracovník</option>
          <option value="admin">Administrátor</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          Zrušit
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl text-xs"
        >
          Uložit změny
        </button>
      </div>
    </form>
  );
};
