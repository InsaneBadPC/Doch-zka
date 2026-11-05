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
    <div className="w-full bg-[#121513] border border-[#232A23] rounded-[28px] p-5 shadow-xl">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D4F73C]"></span>
          Časová osa dne (06:00 – 21:00)
        </span>
        <span className="text-slate-400 font-mono text-[11px]">
          Dnes odpracováno:{' '}
          <strong className="text-white">
            {todayEntries.length + (runningEntry ? 1 : 0)} {todayEntries.length === 1 ? 'směna' : 'směn'}
          </strong>
        </span>
      </div>

      {/* Vizuální pás časové osy */}
      <div className="relative h-11 bg-[#0A0D0B] rounded-2xl overflow-hidden border border-[#202720]">
        {/* Hodinové dělící rysky */}
        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
          {Array.from({ length: totalHours + 1 }).map((_, i) => (
            <div key={i} className="h-full border-r border-slate-600"></div>
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
                className="absolute top-1.5 bottom-1.5 bg-[#D4F73C]/80 hover:bg-[#D4F73C] text-[#090B0A] rounded-xl px-2 flex items-center justify-between text-[10px] font-extrabold overflow-hidden cursor-default transition shadow-md"
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
            className="absolute top-0 bottom-0 w-0.5 bg-[#FF5B65] shadow-lg z-10 pointer-events-none"
            title="Aktuální čas"
          >
            <div className="w-2 h-2 -ml-[3px] rounded-full bg-[#FF5B65]"></div>
          </div>
        )}
      </div>

      {/* Hodinové popisky pod osou */}
      <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 px-1">
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
        className="absolute top-1.5 bottom-1.5 bg-[#D4F73C] text-[#090B0A] rounded-xl px-2 flex items-center justify-between text-[10px] font-black overflow-hidden animate-pulse shadow-lg shadow-[#D4F73C]/30"
        title={`Běžící směna: ${running.projectName}`}
      >
        <span className="truncate">{running.projectName}</span>
        <span className="font-mono tabular-nums shrink-0 ml-1">Probíhá...</span>
      </div>
    );
  } catch {
    return null;
  }
}
