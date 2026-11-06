class Formatters {
  static const List<String> _czechMonths = [
    'Leden',
    'Únor',
    'Březen',
    'Duben',
    'Květen',
    'Červen',
    'Červenec',
    'Srpen',
    'Září',
    'Říjen',
    'Listopad',
    'Prosinec',
  ];

  /// Formátování měny v Kč bez závislosti na intl locale
  static String formatKcz(double amount, {bool showDecimals = true}) {
    if (amount.isNaN || amount.isInfinite) return '0 Kč';
    final isNegative = amount < 0;
    final absVal = amount.abs();
    final hasFraction = showDecimals && (absVal - absVal.truncateToDouble()).abs() > 0.001;
    final fixed = hasFraction ? absVal.toStringAsFixed(2) : absVal.round().toString();
    final parts = fixed.split('.');
    final intPart = parts[0];

    final buffer = StringBuffer();
    for (int i = 0; i < intPart.length; i++) {
      if (i > 0 && (intPart.length - i) % 3 == 0) {
        buffer.write(' ');
      }
      buffer.write(intPart[i]);
    }

    final sign = isNegative ? '-' : '';
    if (hasFraction && parts.length > 1) {
      return '$sign${buffer.toString()},${parts[1]} Kč';
    }
    return '$sign${buffer.toString()} Kč';
  }

  /// Formátování hodin
  static String formatHours(double hours) {
    if (hours.isNaN || hours.isInfinite) return '0.00 h';
    return '${hours.toStringAsFixed(2)} h';
  }

  /// Formátování data YYYY-MM-DD do českého dd.MM.yyyy
  static String formatDateCz(String isoDate) {
    if (isoDate.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoDate);
      final d = dt.day.toString().padLeft(2, '0');
      final m = dt.month.toString().padLeft(2, '0');
      return '$d.$m.${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }

  /// Formátování ISO času do HH:mm
  static String formatTimeFromIso(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString);
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } catch (_) {
      return '';
    }
  }

  /// Formátování stopek HH:mm:ss ze sekund
  static String formatDuration(int totalSeconds) {
    final safe = totalSeconds < 0 ? 0 : totalSeconds;
    final hours = safe ~/ 3600;
    final minutes = (safe % 3600) ~/ 60;
    final seconds = safe % 60;
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  /// Získání klíče měsíce YYYY-MM
  static String toMonthKey(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}';
  }

  /// Získání klíče dne YYYY-MM-DD
  static String toDateKey(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  /// Zobrazení měsíce v záhlaví (např. Listopad 2026)
  static String formatMonthDisplay(DateTime date) {
    final idx = (date.month - 1).clamp(0, 11);
    return '${_czechMonths[idx]} ${date.year}';
  }
}
