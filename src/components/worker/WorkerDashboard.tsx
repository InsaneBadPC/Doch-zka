import React, { useState, useEffect } from 'react';
import { AppUser, Project, SalaryAdvance, TimeEntry } from '../../types';
import { storageService } from '../../services/storage';
import {
  formatDateCz,
  formatHours,
  formatKcz,
  formatMonthDisplay,
  formatTimeFromIso,
  toMonthKey,
} from '../../utils/formatters';
import { ShiftFormModal } from './ShiftFormModal';
import { StopwatchInstrument } from './StopwatchInstrument';
import { DayTimeline } from '../common/DayTimeline';
import { ShareAppModal } from '../common/ShareAppModal';
import { AbsenceCalendar } from '../calendar/AbsenceCalendar';
import { ProjectPhotosModal } from '../projects/ProjectPhotosModal';
import { CreateProjectModal } from '../projects/CreateProjectModal';
import { AdvancedExportModal } from '../export/AdvancedExportModal';
import { GpsLocationModal } from '../common/GpsLocationModal';
import { getCurrentGpsLocation } from '../../utils/geolocation';
import { GpsLocation } from '../../types';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  Send,
  MessageSquare,
  Layers,
  ArrowUpRight,
  Zap,
  Share2,
  Calendar,
  Camera,
  FileSpreadsheet,
  Briefcase,
  MapPin,
  Compass,
} from 'lucide-react';

interface WorkerDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'shifts' | 'calendar' | 'projects'>('shifts');
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activePhotoProject, setActivePhotoProject] = useState<Project | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Stopky & GPS
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isFinishingShift, setIsFinishingShift] = useState(false);
  const [finishBreakMinutes, setFinishBreakMinutes] = useState(30);
  const [finishNote, setFinishNote] = useState('');
  const [finishRate, setFinishRate] = useState(currentUser.defaultHourlyRate);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // GPS stavy
  const [isLocatingStartGps, setIsLocatingStartGps] = useState(false);
  const [finishEndLocation, setFinishEndLocation] = useState<GpsLocation | null>(null);
  const [isLocatingEndGps, setIsLocatingEndGps] = useState(false);
  const [gpsModalEntry, setGpsModalEntry] = useState<TimeEntry | null>(null);

  useEffect(() => {
    const loadData = () => {
      setProjects(storageService.getProjects());
      setEntries(storageService.getTimeEntries());
      setAdvances(storageService.getAdvances(currentUser.id));
    };
    loadData();
    const unsubscribe = storageService.subscribe(loadData);
    return () => unsubscribe();
  }, [currentUser.id]);

  // Ticker pro stopky
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const openProjects = projects.filter((p) => p.status === 'open');

  useEffect(() => {
    if (openProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(openProjects[0].id);
    }
  }, [openProjects, selectedProjectId]);

  const runningShift = entries.find((e) => e.userId === currentUser.id && e.isRunning);

  const handleStartStopwatch = async () => {
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;

    setIsLocatingStartGps(true);
    // Vytvoříme směnu ihned bez zpoždění
    const newShift = storageService.startLiveShift(currentUser, proj);

    // Na pozadí získáme přesnou GPS polohu zařízení
    try {
      const loc = await getCurrentGpsLocation(7000);
      if (loc) {
        storageService.updateShiftLocation(newShift.id, loc);
      }
    } catch {
      // bez chyby, směna běží dál
    } finally {
      setIsLocatingStartGps(false);
    }
  };

  const handleStopStopwatchClick = async () => {
    if (!runningShift) return;
    setFinishRate(runningShift.hourlyRate);
    setIsFinishingShift(true);
    setFinishEndLocation(null);
    setIsLocatingEndGps(true);

    // Automaticky zjistíme GPS ukončení směny
    try {
      const loc = await getCurrentGpsLocation(7000);
      if (loc) {
        setFinishEndLocation(loc);
      }
    } catch {
      // ok
    } finally {
      setIsLocatingEndGps(false);
    }
  };

  const handleFinishShiftConfirm = (submitDirectly: boolean) => {
    if (!runningShift) return;
    const now = new Date();
    const start = new Date(runningShift.startTime);

    const collision = storageService.checkCollision(
      currentUser.id,
      start,
      now,
      runningShift.id
    );
    if (collision) {
      alert('Časová kolize s jinou směnou v databázi!');
      return;
    }

    storageService.stopLiveShift(
      runningShift.id,
      now,
      finishBreakMinutes,
      finishNote,
      finishRate,
      finishRate !== currentUser.defaultHourlyRate,
      submitDirectly,
      finishEndLocation
    );

    setIsFinishingShift(false);
    setFinishNote('');
    setFinishBreakMinutes(30);
    setFinishEndLocation(null);
  };

  const handleCreateProject = (name: string, client: string, budget: number) => {
    const newProj = storageService.createProject(name, client, budget);
    setProjects(storageService.getProjects());
    setSelectedProjectId(newProj.id);
    setIsNewProjectModalOpen(false);
  };

  const monthKey = toMonthKey(selectedMonth);
  const userMonthEntries = entries.filter(
    (e) => e.userId === currentUser.id && e.date.startsWith(monthKey) && !e.isRunning
  );

  let approvedAmount = 0;
  let approvedHours = 0;
  let pendingAmount = 0;
  let pendingHours = 0;

  userMonthEntries.forEach((e) => {
    if (e.status === 'approved') {
      approvedAmount += e.totalAmount;
      approvedHours += e.hoursWorked;
    } else if (e.status === 'pending') {
      pendingAmount += e.totalAmount;
      pendingHours += e.hoursWorked;
    }
  });

  const userMonthAdvances = advances.filter((a) => a.monthKey === monthKey);
  const advancesTotal = userMonthAdvances.reduce((s, a) => s + a.amount, 0);
  const netPayable = approvedAmount - advancesTotal;

  const changeMonth = (delta: number) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1));
  };

  const todayIso = new Date().toISOString().substring(0, 10);

  return (
    <div className="space-y-6">
      {/* Top Navigation Tabs & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121513] border border-[#232A23] p-3 sm:p-4 rounded-[26px]">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'shifts'
                ? 'bg-[#D4F73C] text-black shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#171A18] border border-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Moje docházka & Stopky</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-[#D4F73C] text-black shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#171A18] border border-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kalendář / Žádost o volno</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'projects'
                ? 'bg-[#D4F73C] text-black shadow-md shadow-[#D4F73C]/20'
                : 'text-slate-400 hover:text-white bg-[#171A18] border border-white/5'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Seznam zakázek & Fotky</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-2 bg-[#171A18] hover:bg-[#222723] border border-white/10 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
            title="Exportovat osobní docházku"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4F73C]" />
            <span className="hidden sm:inline">Exportovat</span> výkaz
          </button>

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-2 bg-[#171A18] hover:bg-[#222723] border border-white/10 text-slate-300 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
            title="Sdílet aplikaci Docházka"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Sdílet</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SHIFTS & STOPWATCH */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* 1. KARTA CHRONOMETRU / STOPEK */}
          <StopwatchInstrument
            runningShift={runningShift}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProjectId={setSelectedProjectId}
            onStart={handleStartStopwatch}
            onStop={handleStopStopwatchClick}
            currentTime={currentTime}
            isLocatingGps={isLocatingStartGps}
            onOpenGpsModal={(entry) => setGpsModalEntry(entry)}
            onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
          />

      {/* 2. ČASOVÁ OSA DNEŠNÍHO DNE */}
      <DayTimeline
        entries={entries.filter((e) => e.userId === currentUser.id)}
        currentDateStr={todayIso}
        runningEntry={runningShift}
      />

      {/* 3. MĚSÍČNÍ PŘEHLED A PENĚŽENKA (FINTECH STYLE) */}
      <div className="bg-[#121513] border border-[#232A23] rounded-[30px] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1A221A] transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-sm text-white min-w-[140px] text-center font-mono">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1A221A] transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dvě fintech karty peněženky */}
          <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[#1C231C]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Schváleno k výplatě
              </div>
              <div className="font-mono tabular-nums text-xl sm:text-2xl font-black text-[#D4F73C]">
                {formatKcz(approvedAmount)}
                <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
                  ({formatHours(approvedHours)})
                </span>
              </div>
            </div>

            <div className="h-8 border-r border-[#232A23]"></div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Čeká na schválení
              </div>
              <div className="font-mono tabular-nums text-xl sm:text-2xl font-black text-amber-400">
                {formatKcz(pendingAmount)}
                <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
                  ({formatHours(pendingHours)})
                </span>
              </div>
            </div>

            <div className="h-8 border-r border-[#232A23] hidden sm:block"></div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Čistý doplatek (po zálohách -{formatKcz(advancesTotal)})
              </div>
              <div className="font-mono tabular-nums text-xl sm:text-2xl font-black text-emerald-400">
                {formatKcz(netPayable)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SEZNAM SMĚN A RYCHLÝ ZÁPIS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Odpracované směny ({userMonthEntries.length})
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2 bg-[#1A221A] hover:bg-[#253225] border border-[#2A372A] text-slate-300 hover:text-white font-bold rounded-2xl text-xs flex items-center gap-1.5 transition"
              title="Sdílet aplikaci Docházka"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Sdílet app</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-2xl text-xs flex items-center gap-1.5 transition shadow-lg shadow-[#D4F73C]/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              Zapsat směnu ručně
            </button>
          </div>
        </div>

        {userMonthEntries.length === 0 ? (
          <div className="bg-[#121513] border border-[#232A23] rounded-[30px] p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#1C251C] text-[#D4F73C] mx-auto flex items-center justify-center mb-3">
              <Layers className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Žádné směny v tomto měsíci</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              V tomto měsíci nemáte zaevidovány žádné směny. Spusťte stopky výše nebo zapište směnu ručně.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-[#D4F73C] text-[#090B0A] font-extrabold rounded-2xl text-xs inline-flex items-center gap-1.5 shadow-md shadow-[#D4F73C]/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Zapsat první směnu
            </button>
          </div>
        ) : (
          <div className="bg-[#121513] border border-[#232A23] rounded-[30px] overflow-hidden shadow-xl divide-y divide-[#1C231C]">
            {userMonthEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 sm:p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  entry.status === 'rejected'
                    ? 'bg-[#2A1516]/40'
                    : 'hover:bg-[#161D16]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white">
                      {formatDateCz(entry.date)}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs font-semibold text-slate-300">
                      {entry.projectName}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {formatTimeFromIso(entry.startTime)} – {formatTimeFromIso(entry.endTime)}
                    {entry.breakMinutes > 0 && <span> (pauza {entry.breakMinutes} min)</span>}
                  </div>

                  {entry.note && (
                    <div className="text-xs text-slate-400 italic mt-1 bg-[#0A0D0B] px-3 py-1.5 rounded-xl border border-[#202720] inline-block">
                      „{entry.note}“
                    </div>
                  )}

                  {entry.status === 'rejected' && entry.adminComment && (
                    <div className="mt-2 p-2.5 rounded-xl bg-[#2A1516] border border-[#FF5B65]/40 text-xs text-[#FF5B65]">
                      <div className="font-bold flex items-center gap-1 mb-0.5">
                        <MessageSquare className="w-3 h-3 text-[#FF5B65]" />
                        Komentář šéfa k opravě:
                      </div>
                      <div>{entry.adminComment}</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right font-mono">
                    <div className="text-base font-black text-white tabular-nums">
                      {formatKcz(entry.totalAmount)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatHours(entry.hoursWorked)} × {formatKcz(entry.hourlyRate)}/h
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.startLocation && (
                      <button
                        type="button"
                        onClick={() => setGpsModalEntry(entry)}
                        className="px-2 py-1 rounded-xl bg-[#D4F73C]/10 text-[#D4F73C] border border-[#D4F73C]/30 hover:bg-[#D4F73C]/20 text-xs font-mono font-bold flex items-center gap-1 transition"
                        title="Zobrazit GPS záznam směny"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>GPS</span>
                      </button>
                    )}
                    {entry.status === 'approved' && (
                      <span className="text-xs font-bold text-[#D4F73C] flex items-center gap-1 bg-[#1C251C] px-2.5 py-1 rounded-xl border border-[#2B392B]">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> Schváleno
                      </span>
                    )}
                    {entry.status === 'pending' && (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-[#252012] px-2.5 py-1 rounded-xl border border-[#3E3218]">
                        <Clock className="w-3.5 h-3.5 stroke-[2.5]" /> Čeká
                      </span>
                    )}
                    {entry.status === 'draft' && (
                      <span className="text-xs font-semibold text-slate-400 bg-[#161A16] px-2.5 py-1 rounded-xl border border-[#232A23]">
                        Koncept
                      </span>
                    )}
                    {entry.status === 'rejected' && (
                      <span className="text-xs font-bold text-[#FF5B65] flex items-center gap-1 bg-[#2A1516] px-2.5 py-1 rounded-xl border border-[#3A1E20]">
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" /> Vráceno
                      </span>
                    )}

                    {(entry.status === 'draft' || entry.status === 'rejected') && (
                      <div className="flex items-center gap-1 ml-2">
                        {entry.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Smazat koncept?')) storageService.deleteShift(entry.id);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#FF5B65] transition"
                            title="Smazat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntry(entry);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white transition"
                          title="Upravit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => storageService.submitDraftForApproval(entry.id)}
                          className="px-3 py-1 text-xs font-bold bg-[#D4F73C] text-[#090B0A] rounded-xl hover:bg-[#c4e92a] transition shadow-md shadow-[#D4F73C]/20"
                        >
                          Odeslat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )}

      {/* TAB 2: KALENDÁŘ ABSENCÍ & ŽÁDOST O VOLNO / LÉKAŘE */}
      {activeTab === 'calendar' && (
        <AbsenceCalendar currentUser={currentUser} allUsers={[currentUser]} />
      )}

      {/* TAB 3: SEZNAM ZAKÁZEK A FOTODOKUMENTACE */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121513] border border-[#232A23] rounded-[26px] p-5 shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#D4F73C]" /> Seznam všech vytvořených zakázek ({projects.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Přehled firemních zakázek, váš odpracovaný čas a fotodokumentace
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(true)}
              className="px-3.5 py-2 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-[#D4F73C]/20 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Založit zakázku</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              // Worker privacy: worker only calculates their own hours for this project
              const myProjEntries = entries.filter((e) => e.userId === currentUser.id && e.projectId === proj.id);
              const myHours = myProjEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
              const myEarnings = myProjEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

              return (
                <div
                  key={proj.id}
                  className="bg-[#121513] border border-[#232A23] rounded-[24px] p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-white/20 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-white text-base">{proj.name}</h4>
                        <div className="text-xs text-slate-400 mt-0.5">Klient: {proj.client}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        proj.status === 'open'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-white/5 text-white/40'
                      }`}>
                        {proj.status === 'open' ? 'Aktivní' : 'Uzavřeno'}
                      </span>
                    </div>

                    <div className="p-3 bg-[#0A0D0B] rounded-xl border border-[#202720] space-y-1">
                      <div className="text-[11px] text-slate-400">Vaše odpracované hodiny:</div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-sm font-bold text-white">{formatHours(myHours)}</span>
                        <span className="text-xs font-semibold text-[#D4F73C]">{formatKcz(myEarnings)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fotodokumentace náhled přímo na kartě zakázky pro pracovníka */}
                  {(() => {
                    const projPhotos = storageService.getProjectPhotos(proj.id);
                    return (
                      <div className="pt-2 border-t border-[#1C231C] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#D4F73C]" />
                            Fotodokumentace
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {projPhotos.length === 0 ? 'Bez fotek' : `${projPhotos.length} fotek`}
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
                          <div className="p-2 rounded-xl bg-[#0A0D0B] border border-white/5 text-[11px] text-slate-500 italic text-center">
                            Žádné fotky. Můžete přidat fotku z práce.
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setActivePhotoProject(proj)}
                          className="w-full py-2 px-3 bg-[#171A18] hover:bg-[#D4F73C] text-slate-200 hover:text-black font-semibold text-xs rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{projPhotos.length > 0 ? `Galerie & nahrát foto (${projPhotos.length})` : 'Vyfotit / Nahrát fotku'}</span>
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

      {/* Modal pro ruční zápis / editaci */}
      {isModalOpen && (
        <ShiftFormModal
          user={currentUser}
          projects={projects}
          existingEntry={editingEntry}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEntry(null);
          }}
          onSuccess={() => setEntries(storageService.getTimeEntries())}
        />
      )}

      {/* Dialog dokončení směny ze stopek */}
      {isFinishingShift && runningShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#121513] border border-[#232A23] rounded-[30px] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D4F73C]" /> Ukončení probíhající směny
            </h3>
            <p className="text-xs text-slate-400">
              Zakázka: <strong className="text-white">{runningShift.projectName}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pauza na oběd a odpočinek
              </label>
              <select
                value={finishBreakMinutes}
                onChange={(e) => setFinishBreakMinutes(Number(e.target.value))}
                className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm"
              >
                <option value={0}>0 minut (bez pauzy)</option>
                <option value={15}>15 minut</option>
                <option value={30}>30 minut (doporučeno)</option>
                <option value={45}>45 minut</option>
                <option value={60}>60 minut</option>
              </select>
            </div>

            {currentUser.allowCustomRate && (
              <div>
                <label className="block text-xs font-semibold text-[#D4F73C] mb-1.5">
                  Hodinová sazba pro tuto směnu (Kč/h)
                </label>
                <input
                  type="number"
                  value={finishRate}
                  onChange={(e) => setFinishRate(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#D4F73C]/40 focus:border-[#D4F73C] rounded-2xl text-white text-sm font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Popis vykonané práce (poznámka)
              </label>
              <textarea
                rows={2}
                value={finishNote}
                onChange={(e) => setFinishNote(e.target.value)}
                placeholder="Zadejte stručný popis vykonaných činností..."
                className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm placeholder-slate-500"
              />
            </div>

            {/* GPS souřadnice směny */}
            <div className="p-3.5 rounded-2xl bg-[#0A0D0B] border border-[#232A23] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D4F73C]" />
                  Automatický GPS záznam
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ověření polohy</span>
              </div>

              {runningShift.startLocation && (
                <div className="text-[11px] text-slate-300 font-mono flex items-center justify-between gap-2">
                  <span className="text-slate-400">Zahájení:</span>
                  <span className="text-[#D4F73C] font-semibold truncate">
                    {runningShift.startLocation.latitude.toFixed(4)}, {runningShift.startLocation.longitude.toFixed(4)}
                    {runningShift.startLocation.address ? ` (${runningShift.startLocation.address})` : ''}
                  </span>
                </div>
              )}

              <div className="text-[11px] text-slate-300 font-mono flex items-center justify-between gap-2">
                <span className="text-slate-400">Ukončení:</span>
                {isLocatingEndGps ? (
                  <span className="text-amber-400 animate-pulse flex items-center gap-1">
                    <Compass className="w-3 h-3 animate-spin" /> Zjišťuji GPS ukončení...
                  </span>
                ) : finishEndLocation ? (
                  <span className="text-emerald-400 font-semibold truncate">
                    {finishEndLocation.latitude.toFixed(4)}, {finishEndLocation.longitude.toFixed(4)}
                    {finishEndLocation.address ? ` (${finishEndLocation.address})` : ''}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Nepodařilo se zjistit</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1E251E]">
              <button
                type="button"
                onClick={() => setIsFinishingShift(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Zpět ke stopkám
              </button>
              <button
                type="button"
                onClick={() => handleFinishShiftConfirm(false)}
                className="px-4 py-2.5 bg-[#1A221A] hover:bg-[#253225] text-slate-200 rounded-xl text-xs font-bold border border-[#2A372A]"
              >
                Uložit koncept
              </button>
              <button
                type="button"
                onClick={() => handleFinishShiftConfirm(true)}
                className="px-5 py-2.5 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-[#D4F73C]/20"
              >
                <Send className="w-3.5 h-3.5" /> Odeslat ke schválení
              </button>
            </div>
          </div>
        </div>
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

      {/* Modal pro zobrazení GPS polohy */}
      {gpsModalEntry && (
        <GpsLocationModal
          entry={gpsModalEntry}
          onClose={() => setGpsModalEntry(null)}
        />
      )}

      {/* Modal pro založení nové zakázky */}
      <CreateProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSubmit={handleCreateProject}
        isWorker={true}
      />

      {/* Modal pro pokročilý export */}
      {isExportModalOpen && (
        <AdvancedExportModal
          currentUser={currentUser}
          allUsers={[currentUser]}
          projects={projects}
          entries={entries}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
};
