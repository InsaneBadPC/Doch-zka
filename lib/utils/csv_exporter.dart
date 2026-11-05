import 'package:flutter/services.dart';
import '../models/time_entry.dart';
import 'formatters.dart';

class CsvExporter {
  /// Vygeneruje středníkem oddělený CSV řetězec kompatibilní s českým Microsoft Excel
  /// Hlavička: Datum;Pracovnik;Zakazka;Od;Do;Pauza_min;Hodiny;Sazba_Kc;Celkem_Kc;Poznamka
  static String generateCsv(List<TimeEntry> entries) {
    final buffer = StringBuffer();
    // Hlavička
    buffer.writeln('Datum;Pracovnik;Zakazka;Od;Do;Pauza_min;Hodiny;Sazba_Kc;Celkem_Kc;Poznamka');

    for (final entry in entries) {
      final datum = entry.date;
      final pracovnik = _cleanCsvField(entry.userName);
      final zakazka = _cleanCsvField(entry.projectName);
      final od = Formatters.formatTimeFromIso(entry.startTime);
      final doo = entry.endTime != null ? Formatters.formatTimeFromIso(entry.endTime!) : '';
      final pauza = entry.breakMinutes.toString();
      final hodiny = entry.hoursWorked.toStringAsFixed(2).replaceAll('.', ',');
      final sazba = entry.hourlyRate.toStringAsFixed(2).replaceAll('.', ',');
      final celkem = entry.totalAmount.toStringAsFixed(2).replaceAll('.', ',');
      final poznamka = _cleanCsvField(entry.note);

      buffer.writeln('$datum;$pracovnik;$zakazka;$od;$doo;$pauza;$hodiny;$sazba;$celkem;$poznamka');
    }

    return buffer.toString();
  }

  /// Zkopíruje vygenerovaný výkaz přímo do systémové schránky
  static Future<void> copyToClipboard(List<TimeEntry> entries) async {
    final csv = generateCsv(entries);
    await Clipboard.setData(ClipboardData(text: csv));
  }

  static String _cleanCsvField(String field) {
    // Ošetření uvozovek a středníků
    if (field.contains(';') || field.contains('"') || field.contains('\n')) {
      return '"${field.replaceAll('"', '""')}"';
    }
    return field;
  }
}
