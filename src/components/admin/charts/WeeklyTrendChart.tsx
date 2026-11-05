import React, { useState } from 'react';
import { TimeEntry } from '../../../types';
import { formatHours, formatKcz } from '../../../utils/formatters';
import { TrendingUp, BarChart2, Activity, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface WeeklyTrendChartProps {
  entries: TimeEntry[];
}

export const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({ entries }) => {
  const [metric, setMetric] = useState<'hours' | 'cost'>('hours');
  const [chartMode, setChartMode] = useState<'candle' | 'bars' | 'area'>('candle');
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  const today = new Date();

  // Vygenerujeme data pro zvolený rozsah dnů
  const dataPoints: {
    dateStr: string;
    dayName: string;
    dayNum: string;
    hours: number;
    cost: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number; // počet směn
  }[] = [];

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().substring(0, 10);
    const dayName = dayNames[d.getDay()];
    const dayNum = `${d.getDate()}.${d.getMonth() + 1}.`;

    const dayEntries = entries.filter((e) => e.date === dateStr && !e.isRunning);
    const hours = dayEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const cost = dayEntries.reduce((sum, e) => sum + e.totalAmount, 0);
    const volume = dayEntries.length;

    // Svíčkové hodnoty (pro hodiny / náklady)
    const baseVal = metric === 'hours' ? hours : cost;
    const open = Math.round(baseVal * 0.9 * 10) / 10;
    const close = baseVal;
    const high = Math.round(Math.max(open, close) * (baseVal > 0 ? 1.15 : 1) * 10) / 10;
    const low = Math.round(Math.min(open, close) * (baseVal > 0 ? 0.85 : 1) * 10) / 10;

    dataPoints.push({
      dateStr,
      dayName,
      dayNum,
      hours: Math.round(hours * 100) / 100,
      cost: Math.round(cost),
      open,
      high,
      low,
      close,
      volume,
    });
  }

  const values = dataPoints.map((d) => (metric === 'hours' ? d.hours : d.cost));
  const maxVal = Math.max(metric === 'hours' ? 10 : 3500, ...dataPoints.map((d) => d.high));
  const totalVal = values.reduce((s, v) => s + v, 0);
  const avgVal = rangeDays > 0 ? totalVal / rangeDays : 0;

  const activePoint = hoveredIndex !== null ? dataPoints[hoveredIndex] : dataPoints[dataPoints.length - 1];

  return (
    <div className="bg-[#121513] border border-[#232A23] rounded-[30px] p-5 sm:p-7 shadow-xl space-y-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#D4F73C]/5 rounded-full blur-[90px] pointer-events-none"></div>

      {/* Horní hlavička ve stylu finanční akcie (NVDA na 3. screenshotu) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E251E] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4F73C] animate-pulse"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Živý graf výkonu · {metric === 'hours' ? 'Odpracované hodiny' : 'Mzdové náklady'}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <div className="font-mono text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
              {metric === 'hours' ? `${activePoint?.hours || 0} h` : formatKcz(activePoint?.cost || 0)}
            </div>
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#D4F73C] bg-[#1E271E] px-2.5 py-0.5 rounded-full border border-[#2F3E2F]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{Math.round((avgVal / (maxVal || 1)) * 100)}% aktivita</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 mt-0.5 font-mono">
            Datum: <strong className="text-slate-200">{activePoint?.dayName} {activePoint?.dayNum}</strong> · Směn:{' '}
            <strong className="text-slate-200">{activePoint?.volume || 0}</strong>
          </div>
        </div>

        {/* Přepínače rozsahu a typu grafu ve stylu fintech záložek */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Typ grafu */}
          <div className="flex bg-[#0A0D0B] p-1 rounded-xl border border-[#222922] text-xs">
            <button
              type="button"
              onClick={() => setChartMode('candle')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                chartMode === 'candle'
                  ? 'bg-[#D4F73C] text-[#090B0A] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Fintech svíčkový graf"
            >
              <Activity className="w-3 h-3" /> Svíčky
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bars')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                chartMode === 'bars'
                  ? 'bg-[#D4F73C] text-[#090B0A] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3 h-3" /> Sloupce
            </button>
          </div>

          {/* Rozsah dnů (5m, 15m, 1d styl z obrázku) */}
          <div className="flex bg-[#0A0D0B] p-1 rounded-xl border border-[#222922] text-xs font-mono">
            {[
              { label: '7D', value: 7 },
              { label: '14D', value: 14 },
              { label: '30D', value: 30 },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setRangeDays(t.value)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  rangeDays === t.value
                    ? 'bg-[#1C251C] text-[#D4F73C] border border-[#2E3C2E]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Přepínač metrik: Hodiny / Mzdy */}
          <div className="flex bg-[#0A0D0B] p-1 rounded-xl border border-[#222922] text-xs">
            <button
              type="button"
              onClick={() => setMetric('hours')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                metric === 'hours' ? 'bg-[#D4F73C] text-[#090B0A]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hodiny
            </button>
            <button
              type="button"
              onClick={() => setMetric('cost')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                metric === 'cost' ? 'bg-[#D4F73C] text-[#090B0A]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mzdy
            </button>
          </div>
        </div>
      </div>

      {/* Vlastní grafická plocha (Candlestick / Glowing Bars) - responzivní pro mobily i desktop */}
      <div className="relative pt-2 overflow-x-auto pb-1 -mx-1 px-1">
        {/* Vodorovné vodící linky */}
        <div className="absolute inset-x-0 top-6 bottom-12 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-dashed border-slate-600 w-full"></div>
          <div className="border-b border-dashed border-slate-600 w-full"></div>
          <div className="border-b border-dashed border-slate-600 w-full"></div>
        </div>

        {/* Render svíček nebo sloupců */}
        <div className="h-48 sm:h-56 min-w-[280px] w-full flex items-end justify-between gap-1 sm:gap-2.5 px-1 sm:px-2">
          {dataPoints.map((d, idx) => {
            const isHovered = hoveredIndex === idx;
            const val = metric === 'hours' ? d.hours : d.cost;
            const heightPercent = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const isPositive = d.close >= d.open;

            // Svíčkové rozměry v %
            const candleTop = maxVal > 0 ? (Math.max(d.open, d.close) / maxVal) * 100 : 0;
            const candleBottom = maxVal > 0 ? (Math.min(d.open, d.close) / maxVal) * 100 : 0;
            const candleHeight = Math.max(3, candleTop - candleBottom);
            const wickHeight = maxVal > 0 ? ((d.high - d.low) / maxVal) * 100 : 0;
            const wickBottom = maxVal > 0 ? (d.low / maxVal) * 100 : 0;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group relative"
              >
                {/* Zobrazení svíčkového grafu (přesně jako na 3. mobilu screenshotu) */}
                {chartMode === 'candle' ? (
                  <div className="w-full flex flex-col items-center justify-end h-full relative pb-6">
                    {/* Knot svíčky (Wick) */}
                    {val > 0 && (
                      <div
                        style={{
                          height: `${Math.min(95, Math.max(6, wickHeight))}%`,
                          bottom: `${Math.min(90, wickBottom)}%`,
                        }}
                        className={`absolute w-[1.5px] rounded-full transition-colors ${
                          isHovered
                            ? 'bg-white'
                            : isPositive
                            ? 'bg-[#D4F73C]'
                            : 'bg-[#FF5B65]'
                        }`}
                      />
                    )}

                    {/* Tělo svíčky */}
                    <div
                      style={{
                        height: `${Math.min(90, Math.max(val > 0 ? 8 : 3, candleHeight))}%`,
                        bottom: `${Math.min(88, candleBottom)}%`,
                      }}
                      className={`absolute w-full max-w-[20px] rounded-md transition-all duration-200 ${
                        isHovered
                          ? 'bg-white shadow-lg shadow-white/30'
                          : isPositive && val > 0
                          ? 'bg-[#D4F73C] shadow-sm shadow-[#D4F73C]/20'
                          : val > 0
                          ? 'bg-[#FF5B65]'
                          : 'bg-[#1C221C]'
                      }`}
                    />

                    {/* Objemový sloupec dole (Volume bar jako u akcií) */}
                    <div
                      style={{ height: `${Math.min(22, (d.volume / 4) * 22 || 3)}px` }}
                      className={`w-full max-w-[14px] rounded-xs mt-auto transition-colors ${
                        isPositive ? 'bg-[#D4F73C]/30' : 'bg-[#FF5B65]/30'
                      }`}
                    />
                  </div>
                ) : (
                  /* Standardní svítící sloupcový graf */
                  <div className="w-full flex flex-col items-center justify-end h-full pb-6">
                    <div className="w-full max-w-[32px] bg-[#0A0D0B] rounded-xl h-full flex items-end overflow-hidden p-1">
                      <div
                        style={{ height: `${Math.max(4, heightPercent)}%` }}
                        className={`w-full rounded-lg transition-all duration-300 ${
                          isHovered
                            ? 'bg-white shadow-lg shadow-[#D4F73C]/50'
                            : val > 0
                            ? 'bg-[#D4F73C]'
                            : 'bg-[#1A201A]'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Popisek dne */}
                <div className="text-[10px] font-mono text-slate-400 text-center truncate w-full mt-1">
                  <div className="font-bold">{d.dayName}</div>
                  <div className="text-[9px] text-slate-500">{d.dayNum}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dolní shrnující lišta */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1E251E] text-xs font-mono">
        <div className="flex items-center gap-4 text-slate-400">
          <span>
            Celkem za období:{' '}
            <strong className="text-white">
              {metric === 'hours' ? formatHours(totalVal) : formatKcz(totalVal)}
            </strong>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            Průměr/den:{' '}
            <strong className="text-[#D4F73C]">
              {metric === 'hours' ? `${avgVal.toFixed(1)} h` : formatKcz(avgVal)}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#D4F73C]"></span> Růst výkonu
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#FF5B65]"></span> Pokles / klid
          </span>
        </div>
      </div>
    </div>
  );
};
