import React from 'react';
import { Project, TimeEntry } from '../../types';
import { formatDuration, formatKcz, formatTimeFromIso } from '../../utils/formatters';
import { Play, Square, Briefcase, Zap, TrendingUp, Clock } from 'lucide-react';

interface StopwatchInstrumentProps {
  runningShift?: TimeEntry;
  projects: Project[];
  selectedProjectId: string;
  onSelectProjectId: (id: string) => void;
  onStart: () => void;
  onStop: () => void;
  currentTime: number;
}

export const StopwatchInstrument: React.FC<StopwatchInstrumentProps> = ({
  runningShift,
  projects,
  selectedProjectId,
  onSelectProjectId,
  onStart,
  onStop,
  currentTime,
}) => {
  const openProjects = projects.filter((p) => p.status === 'open');
  const activeProject = projects.find((p) => p.id === (runningShift ? runningShift.projectId : selectedProjectId));

  // Výpočty pro běžící směnu
  let elapsedSec = 0;
  let runningHours = 0;
  let liveEarnings = 0;

  if (runningShift) {
    const startMs = new Date(runningShift.startTime).getTime();
    elapsedSec = Math.max(0, Math.floor((currentTime - startMs) / 1000));
    runningHours = elapsedSec / 3600;
    liveEarnings = Math.round(runningHours * runningShift.hourlyRate * 100) / 100;
  }

  // Kruhový diagram stopek (sekundy 0..60 a hodiny 0..8)
  const secondsInMinute = elapsedSec % 60;
  const progressRatio = runningShift ? Math.min(1, runningHours / 8) : 0;
  const strokeDashoffset = 283 - 283 * progressRatio;

  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
      {/* Background ambient mesh */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 dark:bg-amber-400/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Levá část: Výběr zakázky & stav */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
              Průmyslový časoměřič zakázek
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              {runningShift ? 'Aktivní zakázka směny:' : 'Vyberte otevřenou zakázku:'}
            </label>

            {runningShift ? (
              <div className="p-3.5 bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  {runningShift.projectName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <span>Zahájeno v: <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatTimeFromIso(runningShift.startTime)}</strong></span>
                  <span>·</span>
                  <span>Sazba: <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatKcz(runningShift.hourlyRate)}/h</strong></span>
                </div>
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => onSelectProjectId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#090d16] border border-slate-300 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {openProjects.length === 0 ? (
                  <option value="">Žádná otevřená zakázka</option>
                ) : (
                  openProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.client}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {activeProject && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              <span>Plánovaný rozpočet zakázky: <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatKcz(activeProject.budgetLimitKcz)}</strong></span>
            </div>
          )}
        </div>

        {/* Prostřední / Pravá část: Digitální chronometr */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 shrink-0">
          {/* Kruhový indikátor a čas */}
          <div className="relative flex items-center justify-center">
            {/* SVG Arc Gauge */}
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                className="text-slate-100 dark:text-slate-800 fill-none"
              />
              <circle
                cx="80"
                cy="80"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`fill-none transition-all duration-1000 ${
                  runningShift ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            </svg>

            {/* Čas uvnitř kruhu */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="font-mono tabular-nums text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatDuration(elapsedSec)}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-0.5">
                {runningShift ? 'Probíhá práce' : 'Zastaveno'}
              </div>
            </div>
          </div>

          {/* Finanční ukazatel a Tlačítko Start/Stop */}
          <div className="flex flex-col items-center sm:items-start space-y-3 min-w-[160px]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Naskakující výdělek
              </div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {formatKcz(liveEarnings, true)}
              </div>
            </div>

            <div>
              {!runningShift ? (
                <button
                  type="button"
                  disabled={openProjects.length === 0}
                  onClick={onStart}
                  className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 text-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Spustit směnu (Start)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStop}
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold rounded-2xl shadow-lg shadow-red-600/20 transition flex items-center gap-2 text-sm"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Ukončit směnu
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
