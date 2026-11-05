import React, { useState } from 'react';
import { AppUser, Project, TimeEntry } from '../../types';
import { storageService } from '../../services/storage';
import { formatHours, formatKcz } from '../../utils/formatters';
import { X, Calendar, Clock, AlertTriangle, Moon, Briefcase, Coffee, FileText } from 'lucide-react';

interface ShiftFormModalProps {
  user: AppUser;
  projects: Project[];
  existingEntry?: TimeEntry | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ShiftFormModal: React.FC<ShiftFormModalProps> = ({
  user,
  projects,
  existingEntry,
  onClose,
  onSuccess,
}) => {
  const openProjects = projects.filter((p) => p.status === 'open' || p.id === existingEntry?.projectId);

  const [projectId, setProjectId] = useState<string>(
    existingEntry?.projectId || (openProjects.length > 0 ? openProjects[0].id : '')
  );

  const todayStr = new Date().toISOString().substring(0, 10);
  const [date, setDate] = useState<string>(existingEntry?.date || todayStr);

  const getInitialTime = (isoString?: string | null, fallback: string = '07:00') => {
    if (!isoString) return fallback;
    try {
      const d = new Date(isoString);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return fallback;
    }
  };

  const [startTimeStr, setStartTimeStr] = useState<string>(
    getInitialTime(existingEntry?.startTime, '07:00')
  );
  const [endTimeStr, setEndTimeStr] = useState<string>(
    getInitialTime(existingEntry?.endTime, '15:30')
  );
  const [breakMinutes, setBreakMinutes] = useState<number>(existingEntry?.breakMinutes ?? 30);
  const [hourlyRate, setHourlyRate] = useState<number>(
    existingEntry?.hourlyRate ?? user.defaultHourlyRate
  );
  const [note, setNote] = useState<string>(existingEntry?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const isNightShift = endTimeStr <= startTimeStr;

  const calculateHours = (): number => {
    try {
      const [sh, sm] = startTimeStr.split(':').map(Number);
      const [eh, em] = endTimeStr.split(':').map(Number);

      const start = new Date(date);
      start.setHours(sh, sm, 0, 0);

      const end = new Date(date);
      end.setHours(eh, em, 0, 0);

      if (isNightShift) {
        end.setDate(end.getDate() + 1);
      }

      const totalMins = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      const netMins = Math.max(0, totalMins - breakMinutes);
      return Math.round((netMins / 60) * 100) / 100;
    } catch {
      return 0;
    }
  };

  const hoursWorked = calculateHours();
  const totalAmount = Math.round(hoursWorked * hourlyRate * 100) / 100;

  const handleSave = (sendForApproval: boolean) => {
    setError(null);

    if (!projectId) {
      setError('Vyberte prosím otevřenou zakázku.');
      return;
    }

    try {
      const [sh, sm] = startTimeStr.split(':').map(Number);
      const [eh, em] = endTimeStr.split(':').map(Number);

      const startDate = new Date(date);
      startDate.setHours(sh, sm, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(eh, em, 0, 0);

      if (isNightShift) {
        endDate.setDate(endDate.getDate() + 1);
      }

      // Detekce časové kolize
      const hasCollision = storageService.checkCollision(
        user.id,
        startDate,
        endDate,
        existingEntry?.id
      );

      if (hasCollision) {
        setError(
          `Časová kolize! V rozmezí ${startTimeStr} – ${endTimeStr} (${date}) se již překrývá jiná vaše směna. Upravte čas směny.`
        );
        return;
      }

      const selectedProj = projects.find((p) => p.id === projectId);
      const isCustomRate = hourlyRate !== user.defaultHourlyRate;

      const payload = {
        userId: user.id,
        userName: user.name,
        projectId,
        projectName: selectedProj ? selectedProj.name : 'Zakázka',
        date,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        breakMinutes,
        hoursWorked,
        hourlyRate,
        isCustomRate,
        totalAmount,
        note: note.trim(),
        status: sendForApproval ? ('pending' as const) : ('draft' as const),
        isRunning: false,
        adminComment: '',
        approvedBy: null,
        approvedAt: null,
      };

      if (existingEntry) {
        storageService.updateShift({
          ...existingEntry,
          ...payload,
        });
      } else {
        storageService.createManualShift(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError('Chyba při ukládání: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            {existingEntry ? 'Úprava záznamu směny' : 'Zápis nové směny'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-850 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Zakázka */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Zakázka *
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
            >
              {openProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.client} {p.status === 'closed' ? '[Uzavřeno]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Datum */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Datum směny *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Od - Do */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Čas Od (začátek) *</label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Čas Do (konec) *</label>
              <input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Noční směna hint */}
          {isNightShift && (
            <div className="p-2.5 bg-amber-950/30 border border-amber-800/50 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <Moon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Noční směna:</strong> Čas Do je menší nebo roven času Od. Konec směny je automaticky započítán do dalšího dne (+1 den).
              </span>
            </div>
          )}

          {/* Pauza */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-slate-400" /> Pauza na oběd a odpočinek
            </label>
            <select
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
            >
              <option value={0}>0 minut (bez pauzy)</option>
              <option value={15}>15 minut</option>
              <option value={30}>30 minut (doporučeno)</option>
              <option value={45}>45 minut</option>
              <option value={60}>60 minut (1 hodina)</option>
            </select>
          </div>

          {/* Vlastní sazba */}
          {user.allowCustomRate && (
            <div>
              <label className="block text-xs font-medium text-amber-300 mb-1.5">
                Hodinová sazba pro tuto směnu (Kč/h)
              </label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                min={50}
                className="w-full px-3 py-2 bg-[#090d16] border border-amber-500/40 rounded-xl text-white text-sm focus:outline-none font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Máte oprávnění nastavit pro tuto směnu individuální hodinovou sazbu.
              </p>
            </div>
          )}

          {/* Poznámka */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Popis vykonané práce
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Zadejte stručný popis vykonaných prací..."
              className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Přehled výpočtu */}
          <div className="p-3.5 bg-[#090d16] border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Čistý odpracovaný čas:</div>
              <div className="text-sm font-bold text-white font-mono">{formatHours(hoursWorked)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Vychází k výplatě:</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{formatKcz(totalAmount)}</div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Uložit koncept
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20"
          >
            Odeslat ke schválení
          </button>
        </div>
      </div>
    </div>
  );
};
