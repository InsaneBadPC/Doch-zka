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
import { ShiftFormModal } from './ShiftFormModal';
import { StopwatchInstrument } from './StopwatchInstrument';
import { DayTimeline } from '../common/DayTimeline';
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
} from 'lucide-react';

interface WorkerDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ currentUser }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Stopky
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isFinishingShift, setIsFinishingShift] = useState(false);
  const [finishBreakMinutes, setFinishBreakMinutes] = useState(30);
  const [finishNote, setFinishNote] = useState('');
  const [finishRate, setFinishRate] = useState(currentUser.defaultHourlyRate);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const loadData = () => {
      setProjects(storageService.getProjects());
      setEntries(storageService.getTimeEntries());
    };
    loadData();
    const unsubscribe = storageService.subscribe(loadData);
    return () => unsubscribe();
  }, []);

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

  const handleStartStopwatch = () => {
    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;
    storageService.startLiveShift(currentUser, proj);
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
      submitDirectly
    );

    setIsFinishingShift(false);
    setFinishNote('');
    setFinishBreakMinutes(30);
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

  const changeMonth = (delta: number) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1));
  };

  const todayIso = new Date().toISOString().substring(0, 10);

  return (
    <div className="space-y-6">
      {/* 1. KARTA CHRONOMETRU / STOPEK */}
      <StopwatchInstrument
        runningShift={runningShift}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProjectId={setSelectedProjectId}
        onStart={handleStartStopwatch}
        onStop={() => {
          if (runningShift) {
            setFinishRate(runningShift.hourlyRate);
            setIsFinishingShift(true);
          }
        }}
        currentTime={currentTime}
      />

      {/* 2. ČASOVÁ OSA DNEŠNÍHO DNE */}
      <DayTimeline
        entries={entries.filter((e) => e.userId === currentUser.id)}
        currentDateStr={todayIso}
        runningEntry={runningShift}
      />

      {/* 3. MĚSÍČNÍ PŘEHLED A PENĚŽENKA */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
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

          {/* Dvě karty peněženky */}
          <div className="flex items-center gap-4 sm:gap-8">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Schváleno k výplatě
              </div>
              <div className="font-mono tabular-nums text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatKcz(approvedAmount)}
                <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
                  ({formatHours(approvedHours)})
                </span>
              </div>
            </div>

            <div className="h-8 border-r border-slate-200 dark:border-slate-800"></div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Čeká na schválení
              </div>
              <div className="font-mono tabular-nums text-lg font-black text-amber-500">
                {formatKcz(pendingAmount)}
                <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
                  ({formatHours(pendingHours)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SEZNAM SMĚN A RYCHLÝ ZÁPIS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Odpracované směny ({userMonthEntries.length})
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingEntry(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition hover:opacity-90 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Zapsat směnu ručně
          </button>
        </div>

        {userMonthEntries.length === 0 ? (
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Žádné směny v tomto měsíci</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              V tomto měsíci nemáte zaevidovány žádné směny. Spusťte stopky výše nebo zapište směnu ručně.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Zapsat první směnu
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {userMonthEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  entry.status === 'rejected'
                    ? 'bg-red-50/50 dark:bg-red-950/20'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-850/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {formatDateCz(entry.date)}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {entry.projectName}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {formatTimeFromIso(entry.startTime)} – {formatTimeFromIso(entry.endTime)}
                    {entry.breakMinutes > 0 && <span> (pauza {entry.breakMinutes} min)</span>}
                  </div>

                  {entry.note && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">
                      {entry.note}
                    </div>
                  )}

                  {entry.status === 'rejected' && entry.adminComment && (
                    <div className="mt-2 p-2.5 rounded-lg bg-red-100/70 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-xs text-red-900 dark:text-red-200">
                      <div className="font-bold flex items-center gap-1 mb-0.5">
                        <MessageSquare className="w-3 h-3 text-red-600 dark:text-red-400" />
                        Komentář šéfa k opravě:
                      </div>
                      <div>{entry.adminComment}</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-left sm:text-right font-mono">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatKcz(entry.totalAmount)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatHours(entry.hoursWorked)} × {formatKcz(entry.hourlyRate)}/h
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.status === 'approved' && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Schváleno
                      </span>
                    )}
                    {entry.status === 'pending' && (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Čeká
                      </span>
                    )}
                    {entry.status === 'draft' && (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Koncept
                      </span>
                    )}
                    {entry.status === 'rejected' && (
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Vráceno
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
                            className="p-1.5 text-slate-400 hover:text-red-500 transition"
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
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                          title="Upravit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => storageService.submitDraftForApproval(entry.id)}
                          className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Ukončení probíhající směny
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Zakázka: <strong className="text-slate-900 dark:text-white">{runningShift.projectName}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pauza na oběd a odpočinek
              </label>
              <select
                value={finishBreakMinutes}
                onChange={(e) => setFinishBreakMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm"
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
                <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  Hodinová sazba pro tuto směnu (Kč/h)
                </label>
                <input
                  type="number"
                  value={finishRate}
                  onChange={(e) => setFinishRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#090d16] border border-amber-400 dark:border-amber-500/40 rounded-xl text-slate-900 dark:text-white text-sm font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Popis vykonané práce (poznámka)
              </label>
              <textarea
                rows={2}
                value={finishNote}
                onChange={(e) => setFinishNote(e.target.value)}
                placeholder="Zadejte stručný popis vykonaných činností..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFinishingShift(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Zpět ke stopkám
              </button>
              <button
                type="button"
                onClick={() => handleFinishShiftConfirm(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Uložit návrh
              </button>
              <button
                type="button"
                onClick={() => handleFinishShiftConfirm(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" /> Odeslat ke schválení
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
