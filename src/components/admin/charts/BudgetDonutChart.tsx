import React from 'react';
import { Project, TimeEntry } from '../../../types';
import { formatHours, formatKcz } from '../../../utils/formatters';
import { TrendingUp, AlertTriangle, PieChart } from 'lucide-react';

interface BudgetDonutChartProps {
  projects: Project[];
  entries: TimeEntry[];
}

export const BudgetDonutChart: React.FC<BudgetDonutChartProps> = ({ projects, entries }) => {
  let totalCompanyBudget = 0;
  let totalCompanySpent = 0;

  const projectStats = projects.map((p) => {
    const pEntries = entries.filter((e) => e.projectId === p.id && e.status === 'approved');
    const spent = pEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    const hours = pEntries.reduce((sum, e) => sum + e.hoursWorked, 0);

    totalCompanyBudget += p.budgetLimitKcz;
    totalCompanySpent += spent;

    const percent = p.budgetLimitKcz > 0 ? (spent / p.budgetLimitKcz) * 100 : 0;
    return {
      project: p,
      spent,
      hours,
      percent,
      isOver: spent > p.budgetLimitKcz && p.budgetLimitKcz > 0,
    };
  });

  const overallPercent = totalCompanyBudget > 0 ? Math.min(100, (totalCompanySpent / totalCompanyBudget) * 100) : 0;
  const isOverCompanyBudget = totalCompanySpent > totalCompanyBudget && totalCompanyBudget > 0;

  // Donut SVG parametry
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (circumference * overallPercent) / 100;

  return (
    <div className="bg-[#121513] border border-[#232A23] rounded-[30px] p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#1E251E] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#D4F73C]" /> Čerpání mzdových rozpočtů
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Poměr schválených mezd vůči plánovanému fondu zakázek
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-[#D4F73C] bg-[#1E271E] px-2.5 py-1 rounded-full border border-[#2F3E2F]">
          {projects.length} zakázek
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-1">
        {/* Kruhový diagram */}
        <div className="sm:col-span-5 flex items-center justify-center relative">
          <svg className="w-36 h-36 transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="currentColor"
              strokeWidth="9"
              className="text-[#1A211A] fill-none"
            />
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="currentColor"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className={`fill-none transition-all duration-700 ${
                isOverCompanyBudget
                  ? 'text-[#FF5B65]'
                  : overallPercent > 85
                  ? 'text-amber-400'
                  : 'text-[#D4F73C]'
              }`}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono tabular-nums text-2xl font-black text-white">
              {overallPercent.toFixed(0)}%
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Vyčerpáno
            </div>
          </div>
        </div>

        {/* Sumární karty rozpočtu ve stylu fintech peněženky */}
        <div className="sm:col-span-7 space-y-2.5 text-xs">
          <div className="p-3.5 bg-[#0A0D0B] border border-[#232A23] rounded-2xl space-y-1">
            <div className="text-slate-400 text-[11px] font-mono">Celkový rozpočet zakázek:</div>
            <div className="font-mono text-base font-extrabold text-white">
              {formatKcz(totalCompanyBudget)}
            </div>
          </div>

          <div className="p-3.5 bg-[#0A0D0B] border border-[#232A23] rounded-2xl space-y-1">
            <div className="text-slate-400 text-[11px] font-mono">Dosud vyplaceno pracovníkům:</div>
            <div className="font-mono text-base font-extrabold text-[#D4F73C]">
              {formatKcz(totalCompanySpent)}
            </div>
          </div>
        </div>
      </div>

      {/* Seznam zakázek s neonovými progress bary */}
      <div className="space-y-3 pt-2 border-t border-[#1E251E]">
        {projectStats.map(({ project, spent, percent, isOver }) => (
          <div key={project.id} className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-200 truncate">
                {project.name}
              </span>
              <span className={`font-mono font-bold ${isOver ? 'text-[#FF5B65]' : 'text-slate-400'}`}>
                {formatKcz(spent)} / {formatKcz(project.budgetLimitKcz)} ({percent.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-[#0A0D0B] h-2 rounded-full overflow-hidden border border-[#1E251E]">
              <div
                style={{ width: `${Math.min(100, percent)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  isOver ? 'bg-[#FF5B65]' : percent > 85 ? 'bg-amber-400' : 'bg-[#D4F73C]'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
