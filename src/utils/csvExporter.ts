import { TimeEntry } from '../types';
import { formatTimeFromIso } from './formatters';

function cleanCsvField(val: string): string {
  if (!val) return '';
  if (val.includes(';') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function generateCsv(entries: TimeEntry[]): string {
  const lines: string[] = [];
  // Hlavička pro český Excel
  lines.push('Datum;Pracovnik;Zakazka;Od;Do;Pauza_min;Hodiny;Sazba_Kc;Celkem_Kc;Poznamka');

  for (const entry of entries) {
    const datum = entry.date;
    const pracovnik = cleanCsvField(entry.userName);
    const zakazka = cleanCsvField(entry.projectName);
    const od = formatTimeFromIso(entry.startTime);
    const doCas = entry.endTime ? formatTimeFromIso(entry.endTime) : '';
    const pauza = entry.breakMinutes.toString();
    const hodiny = entry.hoursWorked.toFixed(2).replace('.', ',');
    const sazba = entry.hourlyRate.toFixed(2).replace('.', ',');
    const celkem = entry.totalAmount.toFixed(2).replace('.', ',');
    const poznamka = cleanCsvField(entry.note);

    lines.push(`${datum};${pracovnik};${zakazka};${od};${doCas};${pauza};${hodiny};${sazba};${celkem};${poznamka}`);
  }

  // Přidáme UTF-8 BOM pro bezchybné zobrazení diakritiky v Microsoft Excel
  return '\uFEFF' + lines.join('\r\n');
}

export async function copyCsvToClipboard(entries: TimeEntry[]): Promise<boolean> {
  const csv = generateCsv(entries);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(csv);
      return true;
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = csv;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }
  } catch (err) {
    console.error('Chyba při kopírování do schránky:', err);
    return false;
  }
}

export function downloadCsvFile(entries: TimeEntry[], filename: string = 'vykaz_dochazky.csv'): void {
  const csv = generateCsv(entries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
