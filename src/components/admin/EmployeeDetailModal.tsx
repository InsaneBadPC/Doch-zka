import React, { useState } from 'react';
import {
  User,
  Clock,
  DollarSign,
  Briefcase,
  Calendar,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  Palmtree,
  Stethoscope,
  Thermometer,
  Coffee,
} from 'lucide-react';
import { Absence, AppUser, Project, TimeEntry } from '../../types';
import { formatCurrency, formatHours } from '../../utils/formatters';

interface EmployeeDetailModalProps {
  employee: AppUser;
  entries: TimeEntry[];
  projects: Project[];
  absences: Absence[];
  onClose: () => void;
  onScheduleAbsence: (employeeId: string) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  entries,
  projects,
  absences,
  onClose,
  onScheduleAbsence,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'shifts' | 'absences'>('overview');

  // Employee's entries
  const employeeEntries = entries.filter((e) => e.userId === employee.id);
  const employeeAbsences = absences.filter((a) => a.userId === employee.id);

  const totalHours = employeeEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
  const totalPayout = employeeEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  const approvedHours = employeeEntries
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + (e.hoursWorked || 0), 0);

  // Project breakdown
  const projectStats = projects
    .map((p) => {
      const pEntries = employeeEntries.filter((e) => e.projectId === p.id);
      const hours = pEntries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      const amount = pEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
      return {
        project: p,
        hours,
        amount,
        count: pEntries.length,
      };
    })
    .filter((s) => s.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121513] border border-white/10 w-full max-w-4xl max-h-[92vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-[#171A18]/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D4F73C]/10 border border-[#D4F73C]/20 flex items-center justify-center text-[#D4F73C] font-bold text-lg">
              {employee.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {employee.name}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#D4F73C]/10 text-[#D4F73C] border border-[#D4F73C]/20 font-medium">
                  {employee.role === 'admin' ? 'Vedoucí / Šéf' : 'Pracovník'}
                </span>
                <span className="text-[11px] text-white/50 font-mono">
                  {employee.defaultHourlyRate} Kč/hod
                </span>
              </div>
              <p className="text-xs text-white/50">{employee.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/5 bg-[#121513]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#D4F73C] text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Přehled & Zakázky
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'shifts'
                ? 'border-[#D4F73C] text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Historie směn ({employeeEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'absences'
                ? 'border-[#D4F73C] text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Absence & Kalendář ({employeeAbsences.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#171A18] border border-white/5">
              <div className="text-[11px] text-white/50 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/40" />
                Celkem odpracováno
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {formatHours(totalHours)}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                {formatHours(approvedHours)} schváleno
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#171A18] border border-white/5">
              <div className="text-[11px] text-white/50 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#D4F73C]" />
                Celková mzda
              </div>
              <div className="text-lg font-bold text-[#D4F73C] mt-1">
                {formatCurrency(totalPayout)}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">
                Sazba: {employee.defaultHourlyRate} Kč/h
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#171A18] border border-white/5">
              <div className="text-[11px] text-white/50 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                Aktivní zakázky
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {projectStats.length}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">
                {employeeEntries.length} směn v databázi
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#171A18] border border-white/5">
              <div className="text-[11px] text-white/50 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Nahlášené absence
              </div>
              <div className="text-lg font-bold text-white mt-1">
                {employeeAbsences.length}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">
                Dovolená, lékař, volno
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & PROJECTS BREAKDOWN */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Project Allocation Breakdown */}
              <div className="bg-[#171A18] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#D4F73C]" />
                      Rozpis odpracovaných hodin na zakázkách
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Na kterých konkrétních stavbách a projektech pracovník působil
                    </p>
                  </div>
                </div>

                {projectStats.length === 0 ? (
                  <div className="py-8 text-center text-white/40 text-xs">
                    Tento pracovník zatím nemá zaevidované žádné směny na zakázkách.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectStats.map((item) => {
                      const percentage = totalHours > 0 ? (item.hours / totalHours) * 100 : 0;
                      return (
                        <div
                          key={item.project.id}
                          className="p-3 rounded-xl bg-[#121513] border border-white/5 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="font-semibold text-white truncate max-w-[200px] sm:max-w-none">
                              {item.project.name}
                              <span className="text-[11px] text-white/40 font-normal ml-2">
                                ({item.project.client})
                              </span>
                            </div>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-white font-bold">
                                {formatHours(item.hours)}
                              </span>
                              <span className="text-[#D4F73C]">
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#D4F73C] rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-white/40">
                            <span>{item.count} směn na této zakázce</span>
                            <span>{percentage.toFixed(1)} % celkového fondu</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SHIFTS HISTORY */}
          {activeTab === 'shifts' && (
            <div className="bg-[#171A18] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Všechny směny pracovníka ({employeeEntries.length})
              </span>

              {employeeEntries.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-xs">
                  Žádné zaznamenané směny.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40 font-medium pb-2">
                        <th className="py-2 pr-3">Datum</th>
                        <th className="py-2 pr-3">Zakázka</th>
                        <th className="py-2 pr-3">Čas & Pauza</th>
                        <th className="py-2 pr-3 text-right">Hodiny</th>
                        <th className="py-2 pr-3 text-right">Celkem Kč</th>
                        <th className="py-2 text-center">Stav</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {employeeEntries.map((e) => (
                        <tr key={e.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 pr-3 text-white font-medium">
                            {e.date}
                          </td>
                          <td className="py-2.5 pr-3 text-white/80">
                            {e.projectName}
                          </td>
                          <td className="py-2.5 pr-3 text-white/50 text-[11px]">
                            {e.startTime
                              ? `${new Date(e.startTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} – ${e.endTime ? new Date(e.endTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : 'Probíhá'}`
                              : '–'}
                            {e.breakMinutes > 0 && ` (${e.breakMinutes}m pauza)`}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono font-bold text-white">
                            {formatHours(e.hoursWorked)}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-[#D4F73C]">
                            {formatCurrency(e.totalAmount)}
                          </td>
                          <td className="py-2.5 text-center">
                            {e.status === 'approved' ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                Schváleno
                              </span>
                            ) : e.status === 'pending' ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                Čeká
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                                {e.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ABSENCES & CALENDAR */}
          {activeTab === 'absences' && (
            <div className="bg-[#171A18] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Plánované absence a lékaři ({employeeAbsences.length})
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Kdy bude zaměstnanec nepřítomen (dovolená, lékař, volno)
                  </p>
                </div>
                <button
                  onClick={() => onScheduleAbsence(employee.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4F73C] text-black text-xs font-bold rounded-xl hover:bg-[#c2e232] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Zadat volno / lékaře</span>
                </button>
              </div>

              {employeeAbsences.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-xs">
                  Žádné zaznamenané absence pro tohoto pracovníka.
                </div>
              ) : (
                <div className="space-y-3">
                  {employeeAbsences.map((abs) => {
                    const iconMap = {
                      vacation: Palmtree,
                      doctor: Stethoscope,
                      sick: Thermometer,
                      personal: Coffee,
                    };
                    const typeLabelMap = {
                      vacation: 'Dovolená',
                      doctor: 'Návštěva lékaře',
                      sick: 'Nemocenská',
                      personal: 'Osobní volno',
                    };
                    const Icon = iconMap[abs.type] || Palmtree;

                    return (
                      <div
                        key={abs.id}
                        className="p-3.5 rounded-xl bg-[#121513] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/5 text-white/70">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-2">
                              <span>{typeLabelMap[abs.type]}</span>
                              <span className="text-[11px] text-white/50 font-normal">
                                {abs.startDate === abs.endDate
                                  ? abs.startDate
                                  : `${abs.startDate} až ${abs.endDate}`}
                              </span>
                            </div>
                            <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-2">
                              <span>
                                {abs.isFullDay
                                  ? 'Celý den'
                                  : `${abs.startTime || '08:00'} – ${abs.endTime || '12:00'}`}
                              </span>
                              {abs.note && <span>• „{abs.note}“</span>}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                            abs.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : abs.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {abs.status === 'approved'
                            ? 'Schváleno'
                            : abs.status === 'rejected'
                            ? 'Zamítnuto'
                            : 'Čeká'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-end bg-[#171A18]/50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Zavřít detail
          </button>
        </div>
      </div>
    </div>
  );
};
