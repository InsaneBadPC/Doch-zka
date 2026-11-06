import 'package:flutter/material.dart';
import '../../models/time_entry.dart';
import '../../utils/formatters.dart';

class DayTimelineWidget extends StatelessWidget {
  final List<TimeEntry> entries;
  final String currentDateStr;
  final TimeEntry? runningEntry;

  const DayTimelineWidget({
    super.key,
    required this.entries,
    required this.currentDateStr,
    this.runningEntry,
  });

  @override
  Widget build(BuildContext context) {
    final todayEntries = entries.where((e) => e.date == currentDateStr && !e.isRunning).toList();
    double totalHoursToday = 0;
    for (final e in todayEntries) {
      totalHoursToday += e.hoursWorked;
    }
    if (runningEntry != null && runningEntry!.date == currentDateStr) {
      final start = DateTime.tryParse(runningEntry!.startTime);
      if (start != null) {
        final sec = DateTime.now().difference(start).inSeconds.clamp(0, 86400);
        totalHoursToday += sec / 3600.0;
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.timeline, size: 16, color: Color(0xFFD4F73C)),
                  const SizedBox(width: 6),
                  Text(
                    'DNEŠNÍ ČASOVÁ OSA (${Formatters.formatDateCz(currentDateStr)})',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF94A3B8),
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
              Text(
                'Dnes: ${Formatters.formatHours(totalHoursToday)}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFD4F73C),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              return Column(
                children: [
                  Container(
                    height: 22,
                    width: width,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A0D0B),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF232A23)),
                    ),
                    child: Stack(
                      children: [
                        // Hodinové rysky (6:00, 12:00, 18:00)
                        for (final h in [6, 12, 18])
                          Positioned(
                            left: (h / 24.0) * width,
                            top: 0,
                            bottom: 0,
                            child: Container(width: 1, color: Colors.white10),
                          ),
                        // Odpracované směny dnes
                        ...todayEntries.map((entry) => _buildSegment(entry, width, false)),
                        // Právě běžící směna
                        if (runningEntry != null && runningEntry!.date == currentDateStr)
                          _buildSegment(runningEntry!, width, true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('00:00', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                      Text('06:00', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                      Text('12:00', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                      Text('18:00', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                      Text('24:00', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                    ],
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSegment(TimeEntry entry, double totalWidth, bool isLive) {
    final startDt = DateTime.tryParse(entry.startTime);
    final endDt = isLive
        ? DateTime.now()
        : (entry.endTime != null ? DateTime.tryParse(entry.endTime!) : null);
    if (startDt == null || endDt == null) return const SizedBox.shrink();

    final startHours = (startDt.hour + startDt.minute / 60.0).clamp(0.0, 24.0);
    double endHours = (endDt.hour + endDt.minute / 60.0).clamp(0.0, 24.0);
    if (endHours <= startHours) endHours = 24.0;

    final left = (startHours / 24.0) * totalWidth;
    final segWidth = (((endHours - startHours) / 24.0) * totalWidth).clamp(6.0, totalWidth - left);

    return Positioned(
      left: left,
      top: 2,
      bottom: 2,
      width: segWidth,
      child: Tooltip(
        message: '${entry.projectName}: ${Formatters.formatTimeFromIso(entry.startTime)} – ${isLive ? "nyní" : Formatters.formatTimeFromIso(entry.endTime)}',
        child: Container(
          decoration: BoxDecoration(
            color: isLive
                ? const Color(0xFFF59E0B)
                : (entry.isApproved ? const Color(0xFFD4F73C) : const Color(0xFF38BDF8)),
            borderRadius: BorderRadius.circular(5),
          ),
        ),
      ),
    );
  }
}
