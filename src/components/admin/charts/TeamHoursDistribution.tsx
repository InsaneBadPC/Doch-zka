import React from 'react';
import { AppUser, TimeEntry } from '../../../types';
import { formatHours, formatKcz } from '../../../utils/formatters';
import { Users, Award, ShieldCheck } from 'lucide-react';

interface TeamHoursDistributionProps {
  users: AppUser[];
  entries: TimeEntry[];
}

export const TeamHoursDistribution: React.FC<TeamHoursDistributionProps> = ({ users, entries }) => {
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);

  const workerMetrics = users.map((u) => {
    const userEntries = entries.filter((e) => e.userId === u.id && e.date.startsWith(currentMonthPrefix) && e.status === 'approved');
    const hours = userEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const cost = userEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    return {
      user: u,
      hours: Math.round(hours * 100) / 100,
      cost: Math.round(cost),
    };
  });

  const maxHours = Math.max(1, ...workerMetrics.map((w) => w.hours));

  return (
    <div className="bg-[#121513] border border-[#232A23] rounded-[30px] p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#1E251E] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4F73C]" /> Vytížení pracovního týmu
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Měsíční odpracované hodiny a mzdové náklady dle pracovníků
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-400 bg-[#0A0D0B] px-2.5 py-1 rounded-full border border-[#222922]">
          {users.length} lidí
        </span>
      </div>

      <div className="space-y-4 pt-1">
        {workerMetrics.map(({ user, hours, cost }) => {
          const barWidth = maxHours > 0 ? (hours / maxHours) * 100 : 0;

          return (
            <div key={user.id} className="space-y-1.5 p-3 rounded-2xl bg-[#0A0D0B] border border-[#1E251E] hover:border-[#2E3B2E] transition">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#1C251C] border border-[#2B392B] text-[#D4F73C] font-mono font-bold flex items-center justify-center text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-white">{user.name}</span>
                    <span className="text-[11px] text-slate-500 ml-1.5 font-mono">
                      {user.role === 'admin' ? 'Vedoucí' : 'Pracovník'} · {user.defaultHourlyRate} Kč/h
                    </span>
                  </div>
                </div>

                <div className="font-mono text-right">
                  <div className="font-bold text-white">{formatHours(hours)}</div>
                  <div className="text-[11px] text-[#D4F73C]">{formatKcz(cost)}</div>
                </div>
              </div>

              <div className="w-full bg-[#151915] h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.max(4, barWidth)}%` }}
                  className="h-full bg-[#D4F73C] rounded-full transition-all duration-300"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
