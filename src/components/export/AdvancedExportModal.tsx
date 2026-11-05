import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Printer,
  X,
  FileSpreadsheet,
  Check,
  Filter,
  CheckSquare,
  Square,
  Clock,
  DollarSign,
  Layers,
  Briefcase,
  Users,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { AppUser, Project, TimeEntry } from '../../types';
import { formatCurrency, formatHours } from '../../utils/formatters';

export type ExportReportType = 'attendance' | 'projects' | 'workers';

interface AdvancedExportModalProps {
  currentUser: AppUser;
  allUsers: AppUser[];
  projects: Project[];
  entries: TimeEntry[];
  onClose: () => void;
}

export const AdvancedExportModal: React.FC<AdvancedExportModalProps> = ({
  currentUser,
  allUsers,
  projects,
  entries,
  onClose,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Typ exportu
  const [reportType, setReportType] = useState<ExportReportType>('attendance');

  // Filtry
  const [selectedUserId, setSelectedUserId] = useState<string>(
    isAdmin ? 'all' : currentUser.id
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'approved' | 'all' | 'pending_approved'>('all');

  // Časové období
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const firstDayCurrentMonth = `${currentMonthStr}-01`;
  const lastDayCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .substring(0, 10);

  const [dateFrom, setDateFrom] = useState<string>(firstDayCurrentMonth);
  const [dateTo, setDateTo] = useState<string>(lastDayCurrentMonth);

  // Sloupce pro jednotlivé typy reportů
  const [attendanceCols, setAttendanceCols] = useState({
    date: true,
    worker: isAdmin,
    project: true,
    time: true,
    breakMins: true,
    hours: true,
    rate: true,
    total: true,
    status: true,
    note: true,
  });

  const [projectCols, setProjectCols] = useState({
    name: true,
    client: true,
    status: true,
    budget: true,
    hours: true,
    cost: true,
    remaining: true,
    percent: true,
    shiftCount: true,
  });

  const [workerCols, setWorkerCols] = useState({
    name: true,
    email: true,
    rate: true,
    hours: true,
    cost: true,
    shiftCount: true,
    projectsCount: true,
  });

  const [copied, setCopied] = useState(false);

  // Rychlé předvolby období
  const applyPreset = (preset: 'thisMonth' | 'lastMonth' | 'quarter' | 'year' | 'all') => {
    const y = today.getFullYear();
    const m = today.getMonth();

    if (preset === 'thisMonth') {
      setDateFrom(firstDayCurrentMonth);
      setDateTo(lastDayCurrentMonth);
    } else if (preset === 'lastMonth') {
      const prevMonthDate = new Date(y, m - 1, 1);
      const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const lastDayPrev = new Date(y, m, 0).toISOString().substring(0, 10);
      setDateFrom(`${prevMonthStr}-01`);
      setDateTo(lastDayPrev);
    } else if (preset === 'quarter') {
      const qStartMonth = Math.floor(m / 3) * 3;
      const qStartDate = new Date(y, qStartMonth, 1);
      const qEndDate = new Date(y, qStartMonth + 3, 0);
      setDateFrom(qStartDate.toISOString().substring(0, 10));
      setDateTo(qEndDate.toISOString().substring(0, 10));
    } else if (preset === 'year') {
      setDateFrom(`${y}-01-01`);
      setDateTo(`${y}-12-31`);
    } else {
      setDateFrom('2020-01-01');
      setDateTo('2035-12-31');
    }
  };

  // Filtrované směny
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // Ochrana soukromí: běžný pracovník vidí striktně pouze své záznamy
      if (!isAdmin && e.userId !== currentUser.id) {
        return false;
      }
      if (isAdmin && selectedUserId !== 'all' && e.userId !== selectedUserId) {
        return false;
      }
      if (selectedProjectId !== 'all' && e.projectId !== selectedProjectId) {
        return false;
      }
      if (statusFilter === 'approved' && e.status !== 'approved') {
        return false;
      }
      if (statusFilter === 'pending_approved' && !['approved', 'pending'].includes(e.status)) {
        return false;
      }
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;

      return true;
    });
  }, [entries, isAdmin, currentUser.id, selectedUserId, selectedProjectId, statusFilter, dateFrom, dateTo]);

  // Statistiky zakázek v daném období a pro vybraného pracovníka
  const projectStats = useMemo(() => {
    return projects
      .filter((p) => selectedProjectId === 'all' || p.id === selectedProjectId)
      .map((proj) => {
        const pEntries = filteredEntries.filter((e) => e.projectId === proj.id);
        const hours = pEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
        const cost = pEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const budget = proj.budgetLimitKcz || 0;
        const remaining = budget - cost;
        const percent = budget > 0 ? (cost / budget) * 100 : 0;

        return {
          id: proj.id,
          name: proj.name,
          client: proj.client,
          status: proj.status,
          budget,
          hours,
          cost,
          remaining,
          percent,
          shiftCount: pEntries.length,
        };
      })
      .filter((p) => p.shiftCount > 0 || selectedProjectId !== 'all');
  }, [projects, filteredEntries, selectedProjectId]);

  // Statistiky zaměstnanců v daném období a pro vybranou zakázku
  const workerStats = useMemo(() => {
    const targetUsers = isAdmin
      ? selectedUserId === 'all'
        ? allUsers
        : allUsers.filter((u) => u.id === selectedUserId)
      : [currentUser];

    return targetUsers
      .map((user) => {
        const uEntries = filteredEntries.filter((e) => e.userId === user.id);
        const hours = uEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
        const cost = uEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const uniqueProjects = new Set(uEntries.map((e) => e.projectId)).size;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          rate: user.defaultHourlyRate,
          hours,
          cost,
          shiftCount: uEntries.length,
          projectsCount: uniqueProjects,
        };
      })
      .filter((w) => w.shiftCount > 0 || selectedUserId !== 'all');
  }, [allUsers, currentUser, filteredEntries, isAdmin, selectedUserId]);

  // Celkové součty
  const totalHours = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
  }, [filteredEntries]);

  const totalAmount = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  }, [filteredEntries]);

  // Generování CSV obsahu pro český Excel (středník ;, UTF-8 BOM, čárka u desetinných čísel)
  const generateCsvContent = (): string => {
    const rows: string[] = [];

    if (reportType === 'attendance') {
      const headers: string[] = [];
      if (attendanceCols.date) headers.push('Datum');
      if (attendanceCols.worker) headers.push('Pracovník');
      if (attendanceCols.project) headers.push('Zakázka');
      if (attendanceCols.time) {
        headers.push('Začátek');
        headers.push('Konec');
      }
      if (attendanceCols.breakMins) headers.push('Pauza (min)');
      if (attendanceCols.hours) headers.push('Odpracováno (hod)');
      if (attendanceCols.rate) headers.push('Sazba (Kč/h)');
      if (attendanceCols.total) headers.push('Celkem (Kč)');
      if (attendanceCols.status) headers.push('Stav směny');
      if (attendanceCols.note) headers.push('Poznámka');
      rows.push(headers.join(';'));

      const statusMap: Record<string, string> = {
        approved: 'Schváleno',
        pending: 'Čeká na schválení',
        draft: 'Koncept',
        rejected: 'Zamítnuto',
      };

      filteredEntries.forEach((e) => {
        const line: string[] = [];
        const startTimeStr = e.startTime
          ? new Date(e.startTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
          : '';
        const endTimeStr = e.endTime
          ? new Date(e.endTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
          : '';

        if (attendanceCols.date) line.push(`"${e.date}"`);
        if (attendanceCols.worker) line.push(`"${e.userName.replace(/"/g, '""')}"`);
        if (attendanceCols.project) line.push(`"${e.projectName.replace(/"/g, '""')}"`);
        if (attendanceCols.time) {
          line.push(`"${startTimeStr}"`);
          line.push(`"${endTimeStr}"`);
        }
        if (attendanceCols.breakMins) line.push(String(e.breakMinutes || 0));
        if (attendanceCols.hours) line.push(String(e.hoursWorked).replace('.', ','));
        if (attendanceCols.rate) line.push(String(e.hourlyRate).replace('.', ','));
        if (attendanceCols.total) line.push(String(Math.round(e.totalAmount)));
        if (attendanceCols.status) line.push(`"${statusMap[e.status] || e.status}"`);
        if (attendanceCols.note) line.push(`"${(e.note || '').replace(/"/g, '""')}"`);

        rows.push(line.join(';'));
      });
    } else if (reportType === 'projects') {
      const headers: string[] = [];
      if (projectCols.name) headers.push('Název zakázky');
      if (projectCols.client) headers.push('Klient');
      if (projectCols.status) headers.push('Stav zakázky');
      if (projectCols.budget) headers.push('Rozpočet (Kč)');
      if (projectCols.hours) headers.push('Odpracováno v období (hod)');
      if (projectCols.cost) headers.push('Náklady na mzdy (Kč)');
      if (projectCols.remaining) headers.push('Zbývající rozpočet (Kč)');
      if (projectCols.percent) headers.push('Čerpání rozpočtu (%)');
      if (projectCols.shiftCount) headers.push('Počet směn v období');
      rows.push(headers.join(';'));

      projectStats.forEach((p) => {
        const line: string[] = [];
        if (projectCols.name) line.push(`"${p.name.replace(/"/g, '""')}"`);
        if (projectCols.client) line.push(`"${p.client.replace(/"/g, '""')}"`);
        if (projectCols.status) line.push(`"${p.status === 'open' ? 'Aktivní' : 'Uzavřeno'}"`);
        if (projectCols.budget) line.push(String(p.budget));
        if (projectCols.hours) line.push(String(p.hours.toFixed(2)).replace('.', ','));
        if (projectCols.cost) line.push(String(Math.round(p.cost)));
        if (projectCols.remaining) line.push(String(Math.round(p.remaining)));
        if (projectCols.percent) line.push(String(p.percent.toFixed(1)).replace('.', ','));
        if (projectCols.shiftCount) line.push(String(p.shiftCount));

        rows.push(line.join(';'));
      });
    } else {
      const headers: string[] = [];
      if (workerCols.name) headers.push('Pracovník');
      if (workerCols.email) headers.push('E-mail');
      if (workerCols.rate) headers.push('Základní sazba (Kč/h)');
      if (workerCols.hours) headers.push('Odpracováno (hod)');
      if (workerCols.cost) headers.push('Celková částka k výplatě (Kč)');
      if (workerCols.shiftCount) headers.push('Počet směn');
      if (workerCols.projectsCount) headers.push('Počet zakázek');
      rows.push(headers.join(';'));

      workerStats.forEach((w) => {
        const line: string[] = [];
        if (workerCols.name) line.push(`"${w.name.replace(/"/g, '""')}"`);
        if (workerCols.email) line.push(`"${w.email.replace(/"/g, '""')}"`);
        if (workerCols.rate) line.push(String(w.rate));
        if (workerCols.hours) line.push(String(w.hours.toFixed(2)).replace('.', ','));
        if (workerCols.cost) line.push(String(Math.round(w.cost)));
        if (workerCols.shiftCount) line.push(String(w.shiftCount));
        if (workerCols.projectsCount) line.push(String(w.projectsCount));

        rows.push(line.join(';'));
      });
    }

    return '\uFEFF' + rows.join('\r\n');
  };

  const handleDownloadCsv = () => {
    const csv = generateCsvContent();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const workerTag = isAdmin ? (selectedUserId === 'all' ? 'vsichni' : 'zamestnanec') : 'moje-dochazka';
    const typeTag = reportType === 'attendance' ? 'dochazka' : reportType === 'projects' ? 'zakazky' : 'zamestnanci';
    a.download = `export-${typeTag}-${workerTag}-${dateFrom}-az-${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCsv = async () => {
    const csv = generateCsvContent();
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = csv;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121513] border border-white/10 w-full max-w-4xl max-h-[92vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-[#171A18]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4F73C]/10 border border-[#D4F73C]/20 flex items-center justify-center text-[#D4F73C]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Export docházky a dat o zakázkách
              </h2>
              <p className="text-xs text-white/50">
                Připraveno pro český Microsoft Excel, LibreOffice a tiskový výkaz
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Typ exportu: 3 přepínače */}
          <div className="bg-[#171A18] border border-white/5 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setReportType('attendance')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
                reportType === 'attendance'
                  ? 'bg-[#D4F73C] text-black shadow-md shadow-[#D4F73C]/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Detailní výkaz směn docházky</span>
            </button>

            <button
              type="button"
              onClick={() => setReportType('projects')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
                reportType === 'projects'
                  ? 'bg-[#D4F73C] text-black shadow-md shadow-[#D4F73C]/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Data a mzdové rozpočty zakázek</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setReportType('workers')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
                  reportType === 'workers'
                    ? 'bg-[#D4F73C] text-black shadow-md shadow-[#D4F73C]/20'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Souhrn dle zaměstnanců</span>
              </button>
            )}
          </div>

          {/* Filtry podle období a zaměstnance */}
          <div className="bg-[#171A18] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#D4F73C]" />
                1. Filtrování podle období a zaměstnance
              </span>
              <div className="flex items-center gap-1 text-[11px] flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset('thisMonth')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                  Tento měsíc
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('lastMonth')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                  Minulý měsíc
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('quarter')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                  Kvartál
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('year')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                  Rok
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                  Vše
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Datum od */}
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">
                  Období od (datum)
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-[#121513] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
                />
              </div>

              {/* Datum do */}
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">
                  Období do (datum)
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-[#121513] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
                />
              </div>

              {/* Zaměstnanec */}
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">
                  Zaměstnanec / Pracovník
                </label>
                {isAdmin ? (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-[#121513] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
                  >
                    <option value="all">Všichni zaměstnanci</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={`${currentUser.name} (Pouze vaše hodiny)`}
                    className="w-full bg-[#121513]/60 text-white/60 border border-white/5 rounded-xl px-3 py-2 text-xs cursor-not-allowed"
                  />
                )}
              </div>

              {/* Zakázka */}
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">
                  Zakázka
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#121513] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
                >
                  <option value="all">Všechny zakázky</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stav schválení (pouze pro docházku) */}
            {reportType === 'attendance' && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-white/60">Stav směn:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 text-xs rounded-xl transition ${
                      statusFilter === 'all'
                        ? 'bg-[#D4F73C] text-black font-bold'
                        : 'bg-white/5 text-white/60'
                    }`}
                  >
                    Všechny
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('approved')}
                    className={`px-3 py-1 text-xs rounded-xl transition ${
                      statusFilter === 'approved'
                        ? 'bg-[#D4F73C] text-black font-bold'
                        : 'bg-white/5 text-white/60'
                    }`}
                  >
                    Pouze schválené
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('pending_approved')}
                    className={`px-3 py-1 text-xs rounded-xl transition ${
                      statusFilter === 'pending_approved'
                        ? 'bg-[#D4F73C] text-black font-bold'
                        : 'bg-white/5 text-white/60'
                    }`}
                  >
                    Čekající a schválené
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Výběr sloupců k exportu */}
          <div className="bg-[#171A18] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3">
            <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#D4F73C]" />
              2. Výběr sloupců pro CSV/Excel tabulku
            </span>

            {reportType === 'attendance' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {[
                  { key: 'date', label: 'Datum' },
                  { key: 'worker', label: 'Pracovník' },
                  { key: 'project', label: 'Zakázka' },
                  { key: 'time', label: 'Čas od – do' },
                  { key: 'breakMins', label: 'Pauza' },
                  { key: 'hours', label: 'Odpracováno' },
                  { key: 'rate', label: 'Sazba Kč/h' },
                  { key: 'total', label: 'Částka celkem' },
                  { key: 'status', label: 'Stav směny' },
                  { key: 'note', label: 'Poznámka' },
                ].map(({ key, label }) => {
                  const checked = attendanceCols[key as keyof typeof attendanceCols];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setAttendanceCols((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof typeof attendanceCols],
                        }))
                      }
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition text-left ${
                        checked
                          ? 'bg-[#D4F73C]/10 border-[#D4F73C]/30 text-[#D4F73C]'
                          : 'bg-[#121513] border-white/5 text-white/40'
                      }`}
                    >
                      {checked ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {reportType === 'projects' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {[
                  { key: 'name', label: 'Název zakázky' },
                  { key: 'client', label: 'Klient' },
                  { key: 'status', label: 'Stav (aktivní/uzavřeno)' },
                  { key: 'budget', label: 'Rozpočet (Kč)' },
                  { key: 'hours', label: 'Odpracováno v období' },
                  { key: 'cost', label: 'Náklady na mzdy' },
                  { key: 'remaining', label: 'Zbývající rozpočet' },
                  { key: 'percent', label: 'Čerpání rozpočtu %' },
                  { key: 'shiftCount', label: 'Počet směn' },
                ].map(({ key, label }) => {
                  const checked = projectCols[key as keyof typeof projectCols];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setProjectCols((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof typeof projectCols],
                        }))
                      }
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition text-left ${
                        checked
                          ? 'bg-[#D4F73C]/10 border-[#D4F73C]/30 text-[#D4F73C]'
                          : 'bg-[#121513] border-white/5 text-white/40'
                      }`}
                    >
                      {checked ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {reportType === 'workers' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {[
                  { key: 'name', label: 'Jméno pracovníka' },
                  { key: 'email', label: 'E-mail' },
                  { key: 'rate', label: 'Sazba Kč/h' },
                  { key: 'hours', label: 'Odpracované hodiny' },
                  { key: 'cost', label: 'Mzda celkem' },
                  { key: 'shiftCount', label: 'Počet směn' },
                  { key: 'projectsCount', label: 'Počet zakázek' },
                ].map(({ key, label }) => {
                  const checked = workerCols[key as keyof typeof workerCols];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setWorkerCols((prev) => ({
                          ...prev,
                          [key]: !prev[key as keyof typeof workerCols],
                        }))
                      }
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition text-left ${
                        checked
                          ? 'bg-[#D4F73C]/10 border-[#D4F73C]/30 text-[#D4F73C]'
                          : 'bg-[#121513] border-white/5 text-white/40'
                      }`}
                    >
                      {checked ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Živý souhrn dat */}
          <div className="bg-[#121513] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white uppercase tracking-wider">
                Souhrn pro zvolené filtry
              </span>
              <span className="text-[#D4F73C] font-mono">
                {reportType === 'attendance'
                  ? `${filteredEntries.length} směn nalezeno`
                  : reportType === 'projects'
                  ? `${projectStats.length} zakázek v reportu`
                  : `${workerStats.length} zaměstnanců v reportu`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#171A18] border border-white/5">
                <div className="text-[11px] text-white/50 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  Celkem odpracováno
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {formatHours(totalHours)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#171A18] border border-white/5">
                <div className="text-[11px] text-white/50 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#D4F73C]" />
                  Mzdový náklad celkem
                </div>
                <div className="text-base font-bold text-[#D4F73C] mt-1">
                  {formatCurrency(totalAmount)}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[#171A18] border border-white/5">
                <div className="text-[11px] text-white/50">Formát pro český Excel</div>
                <div className="text-xs font-semibold text-white mt-1">
                  Středník (;), UTF-8 BOM, čárka (8,50)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#171A18]/50">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Tiskový náhled / Uložit PDF</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyCsv}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Zkopírováno!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Kopírovat CSV</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCsv}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#D4F73C] text-black text-xs font-bold rounded-xl hover:bg-[#c2e232] transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,247,60,0.25)]"
            >
              <Download className="w-4 h-4" />
              <span>Stáhnout CSV pro Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
