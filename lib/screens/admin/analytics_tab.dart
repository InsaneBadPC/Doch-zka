import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/project_model.dart';
import '../../models/time_entry.dart';
import '../../services/firestore_service.dart';
import '../../utils/formatters.dart';
import '../common/gps_location_dialog.dart';
import '../common/share_app_dialog.dart';

class AnalyticsTab extends StatefulWidget {
  final AppUser currentUser;
  final FirestoreService firestoreService;
  final void Function(int tabIndex) onNavigateTab;

  const AnalyticsTab({
    super.key,
    required this.currentUser,
    required this.firestoreService,
    required this.onNavigateTab,
  });

  @override
  State<AnalyticsTab> createState() => _AnalyticsTabState();
}

class _AnalyticsTabState extends State<AnalyticsTab> {
  Timer? _liveTicker;

  @override
  void initState() {
    super.initState();
    _liveTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _liveTicker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final monthKey = Formatters.toMonthKey(now);

    return StreamBuilder<List<ProjectModel>>(
      stream: widget.firestoreService.streamProjects(),
      initialData: widget.firestoreService.getProjectsSync(),
      builder: (context, projSnap) {
        final projects = projSnap.data ?? [];

        return StreamBuilder<List<AppUser>>(
          stream: widget.firestoreService.streamAllUsers(),
          initialData: widget.firestoreService.getUsersSync(),
          builder: (context, userSnap) {
            final users = userSnap.data ?? [];

            return StreamBuilder<List<TimeEntry>>(
              stream: widget.firestoreService.streamAllEntries(),
              initialData: widget.firestoreService.getAllEntriesSync(),
              builder: (context, entrySnap) {
                final allEntries = entrySnap.data ?? [];
                final runningEntries = allEntries.where((e) => e.isRunning).toList();
                final pendingEntries = allEntries.where((e) => e.isPending).toList();
                final monthApproved = allEntries
                    .where((e) => !e.isRunning && e.isApproved && e.date.startsWith(monthKey))
                    .toList();

                double totalPayroll = 0;
                double totalHours = 0;
                for (final e in monthApproved) {
                  totalPayroll += e.totalAmount;
                  totalHours += e.hoursWorked;
                }

                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // 1. HERO FINTECH KARTA S RYCHLÝMI AKCEMI
                    _buildHeroCard(
                      totalPayroll: totalPayroll,
                      totalHours: totalHours,
                      pendingCount: pendingEntries.length,
                      openProjectsCount: projects.where((p) => p.isOpen).length,
                    ),
                    const SizedBox(height: 16),

                    // 2. ŽIVÝ PANEL "PRÁVĚ NA SMĚNĚ" (LIVE PRESENCE)
                    _buildLivePresencePanel(runningEntries),
                    const SizedBox(height: 16),

                    // 3. GRAF: POSLEDNÍCH 7 DNÍ (HODINY A NÁKLADY)
                    _buildLast7DaysChart(allEntries),
                    const SizedBox(height: 16),

                    // 4. GRAF: ČERPÁNÍ ROZPOČTŮ ZAKÁZEK
                    _buildProjectBudgetChart(projects, allEntries),
                    const SizedBox(height: 16),

                    // 5. GRAF: VYTÍŽENÍ TÝMU (TENTO MĚSÍC)
                    _buildTeamWorkloadChart(users, monthApproved),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildHeroCard({
    required double totalPayroll,
    required double totalHours,
    required int pendingCount,
    required int openProjectsCount,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'SCHVÁLENÝ MZDOVÝ FOND (TENTO MĚSÍC)',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  color: Color(0xFF94A3B8),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFD4F73C).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Aktivní zakázky: $openProjectsCount',
                  style: const TextStyle(color: Color(0xFFD4F73C), fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            Formatters.formatKcz(totalPayroll),
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: Color(0xFFD4F73C),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 16,
            runSpacing: 6,
            children: [
              Text(
                'Odpracováno: ${Formatters.formatHours(totalHours)}',
                style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600),
              ),
              Text(
                'Čeká na schválení: $pendingCount směn',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: pendingCount > 0 ? const Color(0xFFFF5B65) : const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFF232A23), height: 1),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _quickActionBtn(
                icon: Icons.playlist_add_check,
                label: 'Schvalování ($pendingCount)',
                highlight: pendingCount > 0,
                onTap: () => widget.onNavigateTab(1),
              ),
              _quickActionBtn(
                icon: Icons.business_center_outlined,
                label: 'Zakázky',
                onTap: () => widget.onNavigateTab(2),
              ),
              _quickActionBtn(
                icon: Icons.person_add_alt_1_outlined,
                label: 'Tým & Lidé',
                onTap: () => widget.onNavigateTab(3),
              ),
              _quickActionBtn(
                icon: Icons.calendar_month_outlined,
                label: 'Kalendář',
                onTap: () => widget.onNavigateTab(4),
              ),
              _quickActionBtn(
                icon: Icons.table_chart_outlined,
                label: 'Uzávěrka & CSV',
                onTap: () => widget.onNavigateTab(5),
              ),
              _quickActionBtn(
                icon: Icons.share_outlined,
                label: 'Sdílet app',
                onTap: () {
                  showDialog(context: context, builder: (_) => const ShareAppDialog());
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _quickActionBtn({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool highlight = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: highlight ? const Color(0xFFD4F73C) : const Color(0xFF090B0A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: highlight ? const Color(0xFFD4F73C) : const Color(0xFF232A23),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 15,
              color: highlight ? const Color(0xFF090B0A) : const Color(0xFFD4F73C),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: highlight ? const Color(0xFF090B0A) : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLivePresencePanel(List<TimeEntry> runningEntries) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: runningEntries.isNotEmpty
              ? const Color(0xFF10B981).withOpacity(0.5)
              : const Color(0xFF232A23),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: runningEntries.isNotEmpty ? const Color(0xFF10B981) : const Color(0xFF64748B),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'PRÁVĚ NA SMĚNĚ — ŽIVĚ',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
              Text(
                '${runningEntries.length} aktivních',
                style: TextStyle(
                  color: runningEntries.isNotEmpty ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (runningEntries.isEmpty)
            const Text(
              'Momentálně nikdo nemá zapnuté stopky směny.',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            )
          else
            ...runningEntries.map((entry) {
              final start = DateTime.tryParse(entry.startTime) ?? DateTime.now();
              final elapsedSec = DateTime.now().difference(start).inSeconds.clamp(0, 86400 * 7);
              final liveCost = (elapsedSec / 3600.0) * entry.hourlyRate;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF090B0A),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF232A23)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.timer, color: Color(0xFF10B981), size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            entry.userName,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          Text(
                            '${entry.projectName} · od ${Formatters.formatTimeFromIso(entry.startTime)}',
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    if (entry.startLocation != null)
                      IconButton(
                        icon: const Icon(Icons.location_on, color: Color(0xFF10B981), size: 18),
                        tooltip: 'Zobrazit GPS startu',
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (_) => GpsLocationDialog(entry: entry),
                          );
                        },
                      ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          Formatters.formatDuration(elapsedSec),
                          style: const TextStyle(
                            color: Colors.white,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w900,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          Formatters.formatKcz(liveCost),
                          style: const TextStyle(
                            color: Color(0xFFD4F73C),
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildLast7DaysChart(List<TimeEntry> allEntries) {
    final now = DateTime.now();
    final List<_DayStat> days = [];
    double maxHours = 1.0;

    for (int i = 6; i >= 0; i--) {
      final d = now.subtract(Duration(days: i));
      final dateKey = Formatters.toDateKey(d);
      final dayEntries = allEntries.where((e) => !e.isRunning && e.date == dateKey && (e.isApproved || e.isPending));
      double h = 0;
      double cost = 0;
      for (final e in dayEntries) {
        h += e.hoursWorked;
        cost += e.totalAmount;
      }
      if (h > maxHours) maxHours = h;
      days.add(_DayStat(label: '${d.day}.${d.month}.', hours: h, cost: cost));
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'VÝVOJ ODPRACOVANÝCH HODIN (POSLEDNÍCH 7 DNÍ)',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.6),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 140,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: days.map((d) {
                final ratio = (d.hours / maxHours).clamp(0.0, 1.0);
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          d.hours > 0 ? '${d.hours.toStringAsFixed(1)}h' : '',
                          style: const TextStyle(color: Color(0xFFD4F73C), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          height: (85 * ratio).clamp(4.0, 85.0),
                          decoration: BoxDecoration(
                            color: d.hours > 0 ? const Color(0xFFD4F73C) : const Color(0xFF1E251E),
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          d.label,
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProjectBudgetChart(List<ProjectModel> projects, List<TimeEntry> allEntries) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'ČERPÁNÍ ROZPOČTŮ ZAKÁZEK',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.6),
          ),
          const SizedBox(height: 12),
          ...projects.map((p) {
            final pEntries = allEntries.where((e) => e.projectId == p.id && e.isApproved);
            final spent = pEntries.fold<double>(0, (sum, e) => sum + e.totalAmount);
            final hours = pEntries.fold<double>(0, (sum, e) => sum + e.hoursWorked);
            final pct = p.budgetLimitKcz > 0 ? (spent / p.budgetLimitKcz) : 0.0;
            final over = spent > p.budgetLimitKcz && p.budgetLimitKcz > 0;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          p.name,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        '${Formatters.formatKcz(spent)} / ${Formatters.formatKcz(p.budgetLimitKcz)} (${(pct * 100).toStringAsFixed(0)}%)',
                        style: TextStyle(
                          color: over ? const Color(0xFFFF5B65) : const Color(0xFFD4F73C),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(5),
                    child: LinearProgressIndicator(
                      value: pct.clamp(0.0, 1.0),
                      minHeight: 7,
                      backgroundColor: const Color(0xFF090B0A),
                      color: over
                          ? const Color(0xFFFF5B65)
                          : (pct > 0.8 ? const Color(0xFFF59E0B) : const Color(0xFFD4F73C)),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Odpracováno: ${Formatters.formatHours(hours)} · Klient: ${p.client}',
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildTeamWorkloadChart(List<AppUser> users, List<TimeEntry> monthApproved) {
    double maxUserHours = 1.0;
    final Map<String, double> userHours = {};
    final Map<String, double> userEarned = {};

    for (final u in users) {
      userHours[u.id] = 0;
      userEarned[u.id] = 0;
    }
    for (final e in monthApproved) {
      userHours[e.userId] = (userHours[e.userId] ?? 0) + e.hoursWorked;
      userEarned[e.userId] = (userEarned[e.userId] ?? 0) + e.totalAmount;
      if (userHours[e.userId]! > maxUserHours) {
        maxUserHours = userHours[e.userId]!;
      }
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'VYTÍŽENÍ TÝMU (SCHVÁLENÉ HODINY TENTO MĚSÍC)',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.6),
          ),
          const SizedBox(height: 12),
          ...users.map((u) {
            final h = userHours[u.id] ?? 0;
            final earned = userEarned[u.id] ?? 0;
            final ratio = (h / maxUserHours).clamp(0.0, 1.0);

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        u.name,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Text(
                        '${Formatters.formatHours(h)} · ${Formatters.formatKcz(earned)}',
                        style: const TextStyle(color: Color(0xFFD4F73C), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(5),
                    child: LinearProgressIndicator(
                      value: ratio,
                      minHeight: 6,
                      backgroundColor: const Color(0xFF090B0A),
                      color: const Color(0xFF38BDF8),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _DayStat {
  final String label;
  final double hours;
  final double cost;
  _DayStat({required this.label, required this.hours, required this.cost});
}
