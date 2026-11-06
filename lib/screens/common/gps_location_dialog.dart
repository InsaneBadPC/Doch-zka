import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/time_entry.dart';
import '../../utils/formatters.dart';

class GpsLocationDialog extends StatelessWidget {
  final TimeEntry entry;

  const GpsLocationDialog({super.key, required this.entry});

  @override
  Widget build(BuildContext context) {
    final startLoc = entry.startLocation;
    final endLoc = entry.endLocation;

    return AlertDialog(
      backgroundColor: const Color(0xFF121513),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFF232A23)),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFD4F73C).withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.location_on, color: Color(0xFFD4F73C), size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'GPS Ověření směny',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                ),
                Text(
                  '${entry.userName} · ${Formatters.formatDateCz(entry.date)}',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildLocCard(
              context,
              title: 'ZAČÁTEK SMĚNY (START)',
              time: Formatters.formatTimeFromIso(entry.startTime),
              loc: startLoc,
              accentColor: const Color(0xFFD4F73C),
            ),
            const SizedBox(height: 12),
            _buildLocCard(
              context,
              title: 'KONEC SMĚNY (STOP)',
              time: entry.endTime != null ? Formatters.formatTimeFromIso(entry.endTime) : 'Směna stále běží',
              loc: endLoc,
              accentColor: const Color(0xFF38BDF8),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Zavřít', style: TextStyle(color: Color(0xFFD4F73C), fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildLocCard(
    BuildContext context, {
    required String title,
    required String time,
    required Map<String, dynamic>? loc,
    required Color accentColor,
  }) {
    if (loc == null) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF0A0D0B),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF232A23)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: accentColor, letterSpacing: 0.8),
            ),
            const SizedBox(height: 6),
            const Text(
              'GPS poloha nebyla u tohoto bodu zaznamenána (ruční zápis nebo vypnuté polohové služby).',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
        ),
      );
    }

    final lat = (loc['latitude'] as num?)?.toDouble() ?? 0.0;
    final lng = (loc['longitude'] as num?)?.toDouble() ?? 0.0;
    final acc = (loc['accuracy'] as num?)?.toDouble();
    final addr = loc['address'] as String?;
    final mapsUrl = 'https://www.google.com/maps?q=${lat.toStringAsFixed(6)},${lng.toStringAsFixed(6)}';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0D0B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accentColor.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: accentColor, letterSpacing: 0.8),
              ),
              Text(
                time,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (addr != null && addr.isNotEmpty) ...[
            Text(
              addr,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            ),
            const SizedBox(height: 4),
          ],
          Text(
            'Šířka: ${lat.toStringAsFixed(6)}°  ·  Délka: ${lng.toStringAsFixed(6)}°',
            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontFamily: 'monospace'),
          ),
          if (acc != null) ...[
            const SizedBox(height: 2),
            Text(
              'Přesnost GPS: ±${acc.toStringAsFixed(0)} m',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
          ],
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: accentColor,
                side: BorderSide(color: accentColor.withOpacity(0.4)),
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              ),
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: mapsUrl));
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Odkaz na Google Mapy zkopírován do schránky.')),
                  );
                }
              },
              icon: const Icon(Icons.map_outlined, size: 15),
              label: const Text('Zkopírovat odkaz na Google Mapy', style: TextStyle(fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
