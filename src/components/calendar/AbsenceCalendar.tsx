import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Stethoscope,
  Palmtree,
  Thermometer,
  Coffee,
  X,
} from 'lucide-react';
import { Absence, AbsenceType, AppUser } from '../../types';
import { storageService } from '../../services/storage';

interface AbsenceCalendarProps {
  currentUser: AppUser;
  allUsers?: AppUser[];
}

const TYPE_CONFIG: Record<
  AbsenceType,
  { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; border: string }
> = {
  vacation: {
    label: 'Dovolená',
    icon: Palmtree,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  doctor: {
    label: 'Návštěva lékaře',
    icon: Stethoscope,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
  },
  sick: {
    label: 'Nemocenská',
    icon: Thermometer,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  personal: {
    label: 'Osobní / Neplacené volno',
    icon: Coffee,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
};

const CZ_MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
];

const CZ_DAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export const AbsenceCalendar: React.FC<AbsenceCalendarProps> = ({ currentUser, allUsers = [] }) => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().substring(0, 10));
  const [showModal, setShowModal] = useState(false);
  const [filterUser, setFilterUser] = useState<string>(currentUser.role === 'admin' ? 'all' : currentUser.id);

  // Form states for new absence request
  const [targetUserId, setTargetUserId] = useState<string>(currentUser.id);
  const [formType, setFormType] = useState<AbsenceType>('vacation');
  const [formStartDate, setFormStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formEndDate, setFormEndDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formIsFullDay, setFormIsFullDay] = useState<boolean>(true);
  const [formStartTime, setFormStartTime] = useState<string>('08:00');
  const [formEndTime, setFormEndTime] = useState<string>('12:00');
  const [formNote, setFormNote] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const loadData = () => {
    const list = storageService.getAbsences();
    setAbsences(list);
  };

  useEffect(() => {
    loadData();
    const unsub = storageService.subscribe(loadData);
    return () => unsub();
  }, []);

  const isAdmin = currentUser.role === 'admin';

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // In CZ Monday is first day of week: Sunday (0) -> 6, Monday (1) -> 0
  const startDayWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const resetToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().substring(0, 10));
  };

  // Filter absences
  const visibleAbsences = absences.filter((a) => {
    if (filterUser === 'all') return true;
    return a.userId === filterUser;
  });

  // Check which absences fall on a specific date string (YYYY-MM-DD)
  const getAbsencesForDay = (dateStr: string) => {
    return visibleAbsences.filter((a) => {
      return dateStr >= a.startDate && dateStr <= a.endDate;
    });
  };

  const selectedDayAbsences = getAbsencesForDay(selectedDateStr);

  const handleOpenAddModal = (forDate?: string) => {
    const dateToUse = forDate || selectedDateStr;
    setTargetUserId(currentUser.id);
    setFormType('doctor');
    setFormStartDate(dateToUse);
    setFormEndDate(dateToUse);
    setFormIsFullDay(true);
    setFormStartTime('08:00');
    setFormEndTime('12:00');
    setFormNote('');
    setFormError('');
    setShowModal(true);
  };

  const handleSubmitAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formStartDate) {
      setFormError('Zadejte datum začátku.');
      return;
    }

    if (formStartDate > formEndDate) {
      setFormError('Datum konce nemůže předcházet datu začátku.');
      return;
    }

    if (!formIsFullDay && (!formStartTime || !formEndTime)) {
      setFormError('Zadejte čas od a do.');
      return;
    }

    const targetUser = allUsers.find((u) => u.id === targetUserId) || currentUser;

    storageService.createAbsence(
      {
        userId: targetUser.id,
        userName: targetUser.name,
        type: formType,
        startDate: formStartDate,
        endDate: formEndDate,
        isFullDay: formIsFullDay,
        startTime: formIsFullDay ? undefined : formStartTime,
        endTime: formIsFullDay ? undefined : formEndTime,
        note: formNote.trim(),
      },
      isAdmin ? 'approved' : 'pending'
    );

    setShowModal(false);
  };

  const handleApprove = (absenceId: string) => {
    storageService.approveAbsence(absenceId, currentUser.id);
  };

  const handleReject = (absenceId: string) => {
    storageService.rejectAbsence(absenceId);
  };

  const handleDelete = (absenceId: string) => {
    if (confirm('Opravdu chcete tuto nepřítomnost smazat?')) {
      storageService.deleteAbsence(absenceId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121513] border border-white/5 p-4 sm:p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4F73C]/10 border border-[#D4F73C]/20 flex items-center justify-center text-[#D4F73C]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Kalendář absencí a žádostí o volno
            </h2>
            <p className="text-xs text-white/50">
              Přehled dovolených, návštěv lékaře a plánovaných absencí týmu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && allUsers.length > 0 && (
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-[#1A1E1B] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
            >
              <option value="all">Všichni pracovníci</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4F73C] text-black font-semibold text-xs rounded-xl hover:bg-[#c2e232] transition-colors shadow-[0_0_15px_rgba(212,247,60,0.25)]"
          >
            <Plus className="w-4 h-4" />
            <span>Nahlásit volno / lékaře</span>
          </button>
        </div>
      </div>

      {/* Fronta žádostí ke schválení pro šéfa */}
      {isAdmin && (
        (() => {
          const pendingAbsences = absences.filter((a) => a.status === 'pending');
          if (pendingAbsences.length === 0) return null;
          return (
            <div className="bg-[#171A18] border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  <span>Fronta ke schválení: {pendingAbsences.length} nevyřízených žádostí</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingAbsences.map((abs) => {
                  const cfg = TYPE_CONFIG[abs.type] || TYPE_CONFIG.vacation;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={abs.id}
                      className="p-3.5 rounded-xl bg-[#121513] border border-white/5 space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{abs.userName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/60 mt-1 flex items-center gap-1.5 font-mono">
                          <Clock className="w-3 h-3 text-white/40" />
                          <span>
                            {abs.startDate === abs.endDate ? abs.startDate : `${abs.startDate} – ${abs.endDate}`}
                            {abs.isFullDay ? ' (Celý den)' : ` (${abs.startTime}–${abs.endTime})`}
                          </span>
                        </div>
                        {abs.note && (
                          <div className="text-[11px] text-white/70 italic mt-1 bg-white/[0.02] p-1.5 rounded border border-white/5">
                            „{abs.note}“
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleReject(abs.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        >
                          Zamítnout
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(abs.id)}
                          className="px-3 py-1 text-[11px] font-bold bg-[#D4F73C] hover:bg-[#c2e232] text-black rounded-lg transition shadow-[0_0_10px_rgba(212,247,60,0.2)]"
                        >
                          Schválit žádost
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      )}

      {/* Main Grid: Calendar on Left, Selected Day info on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Calendar View (2 cols wide) */}
        <div className="lg:col-span-2 bg-[#121513] border border-white/5 p-4 sm:p-6 rounded-2xl space-y-4">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white tracking-tight">
                {CZ_MONTHS[month]} {year}
              </span>
              <button
                onClick={resetToToday}
                className="px-2.5 py-1 text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors"
              >
                Dnes
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Předchozí měsíc"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Následující měsíc"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {CZ_DAYS_SHORT.map((day, idx) => (
              <div
                key={day}
                className={`py-1.5 text-xs font-semibold ${
                  idx >= 5 ? 'text-white/30' : 'text-white/60'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots before first day */}
            {Array.from({ length: startDayWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[70px] sm:min-h-[85px] rounded-xl bg-white/[0.01] border border-transparent" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === new Date().toISOString().substring(0, 10);
              const dayAbsences = getAbsencesForDay(dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`min-h-[70px] sm:min-h-[85px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#D4F73C] bg-[#D4F73C]/5 ring-1 ring-[#D4F73C]/30'
                      : 'border-white/5 bg-[#171A18] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                        isToday
                          ? 'bg-[#D4F73C] text-black font-bold'
                          : isSelected
                          ? 'text-[#D4F73C]'
                          : 'text-white/80'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayAbsences.length > 0 && (
                      <span className="text-[10px] text-white/40 font-mono">
                        {dayAbsences.length}
                      </span>
                    )}
                  </div>

                  {/* Absences pill badges on this day */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayAbsences.slice(0, 2).map((a) => {
                      const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.vacation;
                      return (
                        <div
                          key={a.id}
                          className={`text-[9px] sm:text-[10px] truncate px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color} ${cfg.border} font-medium flex items-center gap-1`}
                        >
                          <span className="truncate">{a.userName}</span>
                          {!a.isFullDay && <span className="opacity-70 text-[8px]">({a.startTime})</span>}
                        </div>
                      );
                    })}
                    {dayAbsences.length > 2 && (
                      <div className="text-[9px] text-white/50 font-medium pl-1">
                        +{dayAbsences.length - 2} další
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-3 text-xs">
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={type} className="flex items-center gap-1.5 text-white/70">
                  <span className={`p-1 rounded ${cfg.bg} ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                  </span>
                  <span>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Day Detail */}
        <div className="bg-[#121513] border border-white/5 p-4 sm:p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Program pro {selectedDateStr}
                </h3>
                <p className="text-xs text-white/50">
                  {selectedDayAbsences.length === 0
                    ? 'Žádné nahlášené nepřítomnosti'
                    : `${selectedDayAbsences.length} nahlášených událostí`}
                </p>
              </div>
              <button
                onClick={() => handleOpenAddModal(selectedDateStr)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                title="Přidat na tento den"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List of absences on the selected date */}
            <div className="mt-4 space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {selectedDayAbsences.length === 0 ? (
                <div className="py-12 text-center text-white/40 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-white/20" />
                  <p className="text-xs">Všichni jsou přítomni, žádné volno ani lékař.</p>
                </div>
              ) : (
                selectedDayAbsences.map((abs) => {
                  const cfg = TYPE_CONFIG[abs.type] || TYPE_CONFIG.vacation;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={abs.id}
                      className="p-3.5 rounded-xl bg-[#171A18] border border-white/5 space-y-2 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {abs.userName}
                            </div>
                            <div className={`text-[11px] font-medium ${cfg.color}`}>
                              {cfg.label}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5">
                          {abs.status === 'approved' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Schváleno
                            </span>
                          ) : abs.status === 'rejected' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Zamítnuto
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Čeká na schválení
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Time Range */}
                      <div className="flex items-center gap-2 text-xs text-white/60 bg-black/20 px-2.5 py-1.5 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-white/40" />
                        <span>
                          {abs.isFullDay
                            ? 'Celý den'
                            : `${abs.startTime || '08:00'} – ${abs.endTime || '12:00'}`}
                        </span>
                        {abs.startDate !== abs.endDate && (
                          <span className="text-white/40">
                            (do {abs.endDate})
                          </span>
                        )}
                      </div>

                      {/* Note */}
                      {abs.note && (
                        <p className="text-xs text-white/70 italic bg-white/[0.02] p-2 rounded-lg border border-white/5">
                          „{abs.note}“
                        </p>
                      )}

                      {/* Admin or Owner action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                        {isAdmin && abs.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(abs.id)}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] rounded-lg font-medium transition-colors"
                            >
                              Schválit
                            </button>
                            <button
                              onClick={() => handleReject(abs.id)}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] rounded-lg font-medium transition-colors"
                            >
                              Zamítnout
                            </button>
                          </>
                        )}
                        {(isAdmin || abs.userId === currentUser.id) && (
                          <button
                            onClick={() => handleDelete(abs.id)}
                            className="p-1 text-white/30 hover:text-red-400 transition-colors"
                            title="Smazat záznam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] text-white/40 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-white/30" />
            <span>
              {isAdmin
                ? 'Jako šéf můžete nahlášené absence rovnou schvalovat i zadávat za pracovníky.'
                : 'Vaše žádosti se po odeslání zobrazí vedoucímu ke schválení.'}
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Add Absence Request */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121513] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4F73C]/10 border border-[#D4F73C]/20 flex items-center justify-center text-[#D4F73C]">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Nahlásit nepřítomnost / lékaře / volno
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Vyplňte podrobnosti o plánované absenci
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAbsence} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Target user selector for Admin */}
              {isAdmin && allUsers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Zaměstnanec / Pracovník
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full bg-[#1A1E1B] text-white border border-white/10 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#D4F73C]"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Absence Type Selector */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-2">
                  Typ nepřítomnosti
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TYPE_CONFIG) as [AbsenceType, typeof TYPE_CONFIG[AbsenceType]][]).map(([t, cfg]) => {
                    const Icon = cfg.icon;
                    const isSel = formType === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setFormType(t)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                          isSel
                            ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ring-white/20`
                            : 'bg-[#171A18] border-white/5 text-white/60 hover:border-white/15'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Datum začátku
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (formEndDate < e.target.value) {
                        setFormEndDate(e.target.value);
                      }
                    }}
                    required
                    className="w-full bg-[#1A1E1B] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Datum konce
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    min={formStartDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    required
                    className="w-full bg-[#1A1E1B] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
                  />
                </div>
              </div>

              {/* Full Day vs Specific Hours Toggle */}
              <div className="bg-[#171A18] border border-white/5 p-3 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/80">
                    Rozsah dne
                  </span>
                  <div className="flex items-center gap-1 bg-[#121513] p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormIsFullDay(true)}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                        formIsFullDay
                          ? 'bg-[#D4F73C] text-black'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Celý den
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIsFullDay(false)}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                        !formIsFullDay
                          ? 'bg-[#D4F73C] text-black'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Od – do (hodiny)
                    </button>
                  </div>
                </div>

                {!formIsFullDay && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1">
                        Čas od
                      </label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full bg-[#121513] text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#D4F73C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1">
                        Čas do
                      </label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full bg-[#121513] text-white border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#D4F73C]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Note / Reason */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Důvod / Poznámka (volitelné)
                </label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Např. zubař MUDr. Novotný, rodinné důvody..."
                  rows={2}
                  className="w-full bg-[#1A1E1B] text-white placeholder-white/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium rounded-xl transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#D4F73C] text-black font-semibold text-xs rounded-xl hover:bg-[#c2e232] transition-colors shadow-[0_0_15px_rgba(212,247,60,0.3)]"
                >
                  {isAdmin ? 'Uložit a potvrdit' : 'Odeslat ke schválení'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
