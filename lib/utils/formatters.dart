import 'package:intl/intl.dart';

class Formatters {
  static final NumberFormat _currencyFormat = NumberFormat('#,##0.00', 'cs_CZ');
  static final NumberFormat _integerCurrencyFormat = NumberFormat('#,##0', 'cs_CZ');
  static final DateFormat _dateFormat = DateFormat('dd.MM.yyyy', 'cs_CZ');
  static final DateFormat _monthYearFormat = DateFormat('MM/yyyy', 'cs_CZ');
  static final DateFormat _timeFormat = DateFormat('HH:mm', 'cs_CZ');

  /// Formátování měny v Kč
  static String formatKcz(double amount, {bool showDecimals = true}) {
    if (showDecimals && amount % 1 != 0) {
      return '${_currencyFormat.format(amount)} Kč';
    }
    return '${_integerCurrencyFormat.format(amount)} Kč';
  }

  /// Formátování hodin
  static String formatHours(double hours) {
    return '${hours.toStringAsFixed(2)} h';
  }

  /// Formátování data YYYY-MM-DD do českého dd.MM.yyyy
  static String formatDateCz(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      return _dateFormat.format(dt);
    } catch (_) {
      return isoDate;
    }
  }

  /// Formátování ISO času do HH:mm
  static String formatTimeFromIso(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString);
      return _timeFormat.format(dt);
    } catch (_) {
      return '';
    }
  }

  /// Formátování stopek HH:mm:ss ze sekund
  static String formatDuration(int totalSeconds) {
    final hours = totalSeconds ~/ 3600;
    final minutes = (totalSeconds % 3600) ~/ 60;
    final seconds = totalSeconds % 60;
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  /// Získání klíče měsíce YYYY-MM
  static String toMonthKey(DateTime date) {
    return DateFormat('yyyy-MM').format(date);
  }

  /// Zobrazení měsíce v záhlaví (např. Březen 2026 nebo 03/2026)
  static String formatMonthDisplay(DateTime date) {
    return _monthYearFormat.format(date);
  }
}
