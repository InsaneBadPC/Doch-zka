export function formatKcz(amount: number, showDecimals: boolean = false): string {
  const rounded = Math.round(amount * 100) / 100;
  if (showDecimals || rounded % 1 !== 0) {
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rounded) + ' Kč';
  }
  return new Intl.NumberFormat('cs-CZ', {
    maximumFractionDigits: 0,
  }).format(rounded) + ' Kč';
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(2).replace('.', ',')} h`;
}

export function formatDateCz(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[2], 10)}.${parseInt(parts[1], 10)}.${parts[0]}`;
    }
    const d = new Date(isoDate);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
}

export function formatTimeFromIso(isoString: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthDisplay(date: Date): string {
  const months = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
