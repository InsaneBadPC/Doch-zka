import React from 'react';
import { TimeEntry } from '../../types';
import { formatTimeFromIso } from '../../utils/formatters';

interface DayTimelineProps {
  entries: TimeEntry[];
  currentDateStr: string; // YYYY-MM-DD
  runningEntry?: TimeEntry;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  entries,
  currentDateStr,
  runningEntry,
}) => {
  // Zobrazujeme časovou osu dne od 06:00 do 21:00 (15 hodin)
  const startHour = 6;
  const endHour = 21;
  const totalHours = endHour - startHour;

  const todayEntries = entries.filter((e) => e.date === currentDateStr && !e.isRunning);
  const now = new Date();
  const currentMinutesFromStart =
    (now.getHours() - startHour) * 60 + now.getMinutes();
  const nowPercent = Math.max(0, Math.min(100, (currentMinutesFromStart / (totalHours * 60)) * 100));

  return (
    <div className="w-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Časová osa dne (06:00 – 21:00)
        </span>
        <span className="text-slate-400 font-mono">
          Dnes odpracováno: {todayEntries.length + (runningEntry ? 1 : 0)} směny
        </span>
      </div>

      {/* Vizuální pás časové osy */}
      <div className="relative h-10 bg-slate-100 dark:bg-[#090d16] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Hodinové dělící rysky */}
        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-25 dark:opacity-20">
          {Array.from({ length: totalHours + 1 }).map((_, i) => (
            <div key={i} className="h-full border-r border-slate-400 dark:border-slate-600"></div>
          ))}
        </div>

        {/* Uložené směny na ose */}
        {todayEntries.map((e) => {
          try {
            const start = new Date(e.startTime);
            const end = e.endTime ? new Date(e.endTime) : new Date();
            const startMins = (start.getHours() - startHour) * 60 + start.getMinutes();
            const endMins = (end.getHours() - startHour) * 60 + end.getMinutes();

            const left = Math.max(0, (startMins / (totalHours * 60)) * 100);
            const width = Math.max(1.5, ((endMins - startMins) / (totalHours * 60)) * 100);

            return (
              <div
                key={e.id}
                style={{ left: `${left}%`, width: `${width}%` }}
                className="absolute top-1 bottom-1 bg-amber-500/80 hover:bg-amber-400 dark:bg-amber-500/90 text-slate-950 rounded-lg px-2 flex items-center justify-between text-[10px] font-bold overflow-hidden cursor-default transition shadow-xs"
                title={`${e.projectName}: ${formatTimeFromIso(e.startTime)} - ${formatTimeFromIso(e.endTime)} (${e.hoursWorked} h)`}
              >
                <span className="truncate">{e.projectName}</span>
                <span className="font-mono tabular-nums shrink-0 ml-1">{e.hoursWorked}h</span>
              </div>
            );
          } catch {
            return null;
          }
        })}

        {/* Právě běžící směna na ose */}
        {runningShiftOnTimeline(runningEntry, startHour, totalHours)}

        {/* Ryska aktuálního času */}
        {currentMinutesFromStart >= 0 && currentMinutesFromStart <= totalHours * 60 && (
          <div
            style={{ left: `${nowPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-sm z-10 pointer-events-none"
            title="Aktuální čas"
          >
            <div className="w-1.5 h-1.5 -ml-0.5 rounded-full bg-red-500"></div>
          </div>
        )}
      </div>

      {/* Hodinové popisky pod osou */}
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5 px-0.5">
        <span>06:00</span>
        <span>09:00</span>
        <span>12:00</span>
        <span>15:00</span>
        <span>18:00</span>
        <span>21:00</span>
      </div>
    </div>
  );
};

function runningShiftOnTimeline(running?: TimeEntry, startHour = 6, totalHours = 15) {
  if (!running) return null;
  try {
    const start = new Date(running.startTime);
    const now = new Date();
    const startMins = (start.getHours() - startHour) * 60 + start.getMinutes();
    const endMins = (now.getHours() - startHour) * 60 + now.getMinutes();

    const left = Math.max(0, (startMins / (totalHours * 60)) * 100);
    const width = Math.max(2, ((endMins - startMins) / (totalHours * 60)) * 100);

    return (
      <div
        style={{ left: `${left}%`, width: `${width}%` }}
        className="absolute top-1 bottom-1 bg-emerald-500/90 text-slate-950 rounded-lg px-2 flex items-center justify-between text-[10px] font-bold overflow-hidden animate-pulse shadow-md"
        title={`Běžící směna: ${running.projectName}`}
      >
        <span className="truncate">{running.projectName}</span>
        <span className="font-mono tabular-nums shrink-0 ml-1">Právě probíhá</span>
      </div>
    );
  } catch {
    return null;
  }
}
