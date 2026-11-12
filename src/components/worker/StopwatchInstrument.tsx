import React from 'react';
import { Project, TimeEntry } from '../../types';
import { formatDuration, formatKcz, formatTimeFromIso } from '../../utils/formatters';
import { Play, Square, Briefcase, TrendingUp, Clock, Zap, MapPin, Compass, Plus } from 'lucide-react';

interface StopwatchInstrumentProps {
  runningShift?: TimeEntry;
  projects: Project[];
  selectedProjectId: string;
  onSelectProjectId: (id: string) => void;
  onStart: () => void;
  onStop: () => void;
  currentTime: number;
  isLocatingGps?: boolean;
  onOpenGpsModal?: (entry: TimeEntry) => void;
  onOpenNewProjectModal?: () => void;
}

export const StopwatchInstrument: React.FC<StopwatchInstrumentProps> = ({
  runningShift,
  projects,
  selectedProjectId,
  onSelectProjectId,
  onStart,
  onStop,
  currentTime,
  isLocatingGps = false,
  onOpenGpsModal,
  onOpenNewProjectModal,
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
  const progressRatio = runningShift ? Math.min(1, runningHours / 8) : 0;
  const strokeDashoffset = 283 - 283 * progressRatio;

  return (
    <div className="relative overflow-hidden bg-[#121513] border border-[#232A23] rounded-[32px] p-6 sm:p-8 shadow-2xl">
      {/* Background ambient radial glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4F73C]/10 rounded-full blur-[110px] pointer-events-none -mr-20 -mt-20"></div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Levá část: Výběr zakázky & stav */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4F73C] animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400">
              Chytrý časoměřič zakázek
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-[#D4F73C]" />
              {runningShift ? 'Aktivní zakázka směny:' : 'Vyberte otevřenou zakázku:'}
            </label>

            {runningShift ? (
              <div className="p-4 bg-[#0A0D0B] border border-[#232A23] rounded-2xl space-y-1">
                <div className="text-xl font-extrabold text-white">
                  {runningShift.projectName}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2 font-mono">
                  <span>Zahájeno: <strong className="text-slate-200">{formatTimeFromIso(runningShift.startTime)}</strong></span>
                  <span className="text-slate-600">·</span>
                  <span>Sazba: <strong className="text-[#D4F73C]">{formatKcz(runningShift.hourlyRate)}/h</strong></span>
                </div>

                {runningShift.startLocation ? (
                  <button
                    type="button"
                    onClick={() => onOpenGpsModal?.(runningShift)}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D4F73C]/10 border border-[#D4F73C]/30 text-[#D4F73C] text-[11px] font-mono hover:bg-[#D4F73C]/20 transition text-left"
                    title="Klikněte pro zobrazení GPS polohy zahájení na mapě"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>GPS: {runningShift.startLocation.latitude.toFixed(4)}, {runningShift.startLocation.longitude.toFixed(4)}</span>
                    {runningShift.startLocation.address && (
                      <span className="text-white/70 font-sans truncate max-w-[200px]">· {runningShift.startLocation.address}</span>
                    )}
                  </button>
                ) : isLocatingGps ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#D4F73C] font-mono animate-pulse">
                    <Compass className="w-3.5 h-3.5 animate-spin" />
                    <span>Zaznamenávám GPS polohu zahájení směny...</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => onSelectProjectId(e.target.value)}
                  className="flex-1 px-4 py-3.5 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm font-semibold focus:outline-none transition"
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
                {onOpenNewProjectModal && (
                  <button
                    type="button"
                    onClick={onOpenNewProjectModal}
                    className="p-3.5 bg-[#171A18] hover:bg-[#D4F73C] text-slate-300 hover:text-black border border-[#232A23] hover:border-[#D4F73C] rounded-2xl transition shrink-0 flex items-center gap-1 font-bold text-xs"
                    title="Vytvořit novou zakázku"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Nová</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {activeProject && (
            <div className="text-xs text-slate-400 flex items-center gap-2 pt-0.5 font-mono">
              <TrendingUp className="w-3.5 h-3.5 text-[#D4F73C]" />
              <span>Plánovaný rozpočet zakázky: <strong className="text-slate-200">{formatKcz(activeProject.budgetLimitKcz)}</strong></span>
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
                strokeWidth="7"
                className="text-[#1A211A] fill-none"
              />
              <circle
                cx="80"
                cy="80"
                r="45"
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`fill-none transition-all duration-1000 ${
                  runningShift ? 'text-[#D4F73C]' : 'text-slate-700'
                }`}
              />
            </svg>

            {/* Čas uvnitř kruhu */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="font-mono tabular-nums text-2xl font-black text-white tracking-tight">
                {formatDuration(elapsedSec)}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-0.5">
                {runningShift ? 'Probíhá práce' : 'Zastaveno'}
              </div>
            </div>
          </div>

          {/* Finanční ukazatel a Tlačítko Start/Stop v neonových barvách */}
          <div className="flex flex-col items-center sm:items-start space-y-3 min-w-[170px]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Naskakující výdělek
              </div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black text-[#D4F73C]">
                {formatKcz(liveEarnings, true)}
              </div>
            </div>

            <div className="w-full">
              {!runningShift ? (
                <button
                  type="button"
                  disabled={openProjects.length === 0}
                  onClick={onStart}
                  className="w-full sm:w-auto justify-center px-6 py-3.5 bg-[#D4F73C] hover:bg-[#c4e92a] active:scale-[0.98] disabled:opacity-40 text-[#090B0A] font-extrabold rounded-2xl shadow-lg shadow-[#D4F73C]/20 transition flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Spustit směnu (Start)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStop}
                  className="w-full sm:w-auto justify-center px-6 py-3.5 bg-[#FF5B65] hover:bg-[#e44c56] active:scale-[0.98] text-white font-extrabold rounded-2xl shadow-lg shadow-[#FF5B65]/20 transition flex items-center gap-2 text-sm cursor-pointer"
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
