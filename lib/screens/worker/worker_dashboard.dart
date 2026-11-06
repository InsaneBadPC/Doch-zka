import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/app_user.dart';
import '../../models/project_model.dart';
import '../../models/salary_advance.dart';
import '../../models/time_entry.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../../utils/formatters.dart';
import '../common/absence_calendar_view.dart';
import '../common/day_timeline_widget.dart';
import '../common/gps_location_dialog.dart';
import '../common/project_photos_dialog.dart';
import '../common/share_app_dialog.dart';
import 'shift_form_dialog.dart';

class WorkerDashboard extends StatefulWidget {
  final AppUser currentUser;
  final AuthService authService;
  final FirestoreService firestoreService;

  const WorkerDashboard({
    super.key,
    required this.currentUser,
    required this.authService,
    required this.firestoreService,
  });

  @override
  State<WorkerDashboard> createState() => _WorkerDashboardState();
}

class _WorkerDashboardState extends State<WorkerDashboard> {
  int _selectedTabIndex = 0; // 0 = Docházka, 1 = Kalendář & Volno, 2 = Zakázky & Fotky
  DateTime _selectedMonth = DateTime.now();
  Timer? _ticker;
  String? _selectedProjectId;
  bool _isStartingShift = false;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _changeMonth(int delta) {
    setState(() {
      _selectedMonth = DateTime(
        _selectedMonth.year,
        _selectedMonth.month + delta,
        1,
      );
    });
  }

  Future<void> _startLiveShiftDirect(List<ProjectModel> projects) async {
    final openProjects = projects.where((p) => p.isOpen).toList();
    if (openProjects.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nejsou k dispozici žádné otevřené zakázky.')),
      );
      return;
    }

    final targetId = (_selectedProjectId != null && openProjects.any((p) => p.id == _selectedProjectId))
        ? _selectedProjectId!
        : openProjects.first.id;
    final project = openProjects.firstWhere((p) => p.id == targetId);

    setState(() => _isStartingShift = true);
    try {
      Map<String, dynamic>? loc;
      try {
        loc = await LocationService.getCurrentLocation().timeout(const Duration(seconds: 4));
      } catch (_) {}

      await widget.firestoreService.startLiveShift(
        user: widget.currentUser,
        project: project,
        startLocation: loc,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Chyba při spuštění stopek: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isStartingShift = false);
    }
  }

  Future<void> _stopLiveShift(TimeEntry runningEntry) async {
    final now = DateTime.now();
    int breakMinutes = 0;
    double hourlyRate = runningEntry.hourlyRate;
    final noteController = TextEditingController();

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final start = DateTime.parse(runningEntry.startTime);
          final durationMinutes = now.difference(start).inMinutes;
          final netMinutes = (durationMinutes - breakMinutes).clamp(0, 24 * 60);
          final hours = double.parse((netMinutes / 60.0).toStringAsFixed(2));
          final amount = double.parse((hours * hourlyRate).toStringAsFixed(2));

          return AlertDialog(
            title: const Text(
              'Ukončit běžící směnu',
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Zakázka: ${runningEntry.projectName}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Začátek: ${Formatters.formatTimeFromIso(runningEntry.startTime)} | Konec: ${Formatters.formatTimeFromIso(now.toIso8601String())}',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<int>(
                    value: breakMinutes,
                    decoration: const InputDecoration(labelText: 'Pauza'),
                    items: const [
                      DropdownMenuItem(value: 0, child: Text('0 minut (bez pauzy)')),
                      DropdownMenuItem(value: 15, child: Text('15 minut')),
                      DropdownMenuItem(value: 30, child: Text('30 minut')),
                      DropdownMenuItem(value: 45, child: Text('45 minut')),
                      DropdownMenuItem(value: 60, child: Text('60 minut')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => breakMinutes = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  if (widget.currentUser.allowCustomRate) ...[
                    TextFormField(
                      initialValue: hourlyRate.toStringAsFixed(0),
                      decoration: const InputDecoration(labelText: 'Hodinová sazba (Kč)'),
                      keyboardType: TextInputType.number,
                      onChanged: (val) {
                        final parsed = double.tryParse(val);
                        if (parsed != null) setDialogState(() => hourlyRate = parsed);
                      },
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: noteController,
                    decoration: const InputDecoration(labelText: 'Poznámka / vykonaná práce'),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A0D0B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF232A23)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Čistý čas: ${Formatters.formatHours(hours)}', style: const TextStyle(color: Colors.white)),
                        Text(
                          Formatters.formatKcz(amount),
                          style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFFD4F73C), fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(null),
                child: const Text('Zpět'),
              ),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF232A23)),
                ),
                onPressed: () => Navigator.of(ctx).pop({
                  'submit': false,
                  'break': breakMinutes,
                  'rate': hourlyRate,
                  'note': noteController.text,
                }),
                child: const Text('Uložit koncept'),
              ),
              FilledButton.icon(
                onPressed: () => Navigator.of(ctx).pop({
                  'submit': true,
                  'break': breakMinutes,
                  'rate': hourlyRate,
                  'note': noteController.text,
                }),
                icon: const Icon(Icons.send, size: 16),
                label: const Text('Odeslat'),
              ),
            ],
          );
        },
      ),
    );

    if (result != null) {
      final start = DateTime.parse(runningEntry.startTime);
      final hasOverlap = await widget.firestoreService.hasCollision(
        userId: widget.currentUser.id,
        newStart: start,
        newEnd: now,
        excludeEntryId: runningEntry.id,
      );

      if (hasOverlap) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: Color(0xFFFF5B65),
              content: Text('Kolize! Čas směny se překrývá s jiným záznamem.'),
            ),
          );
        }
        return;
      }

      Map<String, dynamic>? loc;
      try {
        loc = await LocationService.getCurrentLocation().timeout(const Duration(seconds: 4));
      } catch (_) {}

      await widget.firestoreService.stopLiveShift(
        runningEntry: runningEntry,
        endTime: now,
        breakMinutes: result['break'] as int,
        note: result['note'] as String,
        hourlyRate: result['rate'] as double,
        isCustomRate: (result['rate'] as double) != widget.currentUser.defaultHourlyRate,
        submitDirectly: result['submit'] as bool,
        endLocation: loc,
      );
    }
  }

  void _showPayslipDialog({
    required String monthKey,
    required List<TimeEntry> monthEntries,
    required List<SalaryAdvance> monthAdvances,
    required double approvedAmount,
    required double approvedHours,
    required double pendingAmount,
    required double pendingHours,
    required double advancesTotal,
    required double netPayable,
  }) {
    final buffer = StringBuffer();
    buffer.writeln('VÝPLATNÍ LÍSTEK - ${widget.currentUser.name} ($monthKey)');
    buffer.writeln('================================================');
    buffer.writeln('Schváleno celkem: ${Formatters.formatKcz(approvedAmount)} (${Formatters.formatHours(approvedHours)})');
    buffer.writeln('Čeká na schválení: ${Formatters.formatKcz(pendingAmount)} (${Formatters.formatHours(pendingHours)})');
    buffer.writeln('Vyplacené zálohy: -${Formatters.formatKcz(advancesTotal)}');
    buffer.writeln('ČISTÝ DOPLATEK K VÝPLATĚ: ${Formatters.formatKcz(netPayable)}');
    buffer.writeln('');
    buffer.writeln('Datum;Zakázka;Od;Do;Pauza(min);Hodiny;Sazba;Částka(Kč);Stav;Poznámka');
    for (final e in monthEntries) {
      buffer.writeln(
        '${e.date};"${e.projectName}";${Formatters.formatTimeFromIso(e.startTime)};'
        '${e.endTime != null ? Formatters.formatTimeFromIso(e.endTime!) : ""};'
        '${e.breakMinutes};${e.hoursWorked};${e.hourlyRate};${e.totalAmount};${e.status};"${e.note}"',
      );
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF121513),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: Color(0xFF232A23)),
        ),
        title: Row(
          children: [
            const Icon(Icons.receipt_long_outlined, color: Color(0xFFD4F73C)),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Výplatní lístek ($monthKey)',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF090B0A),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF232A23)),
                ),
                child: Column(
                  children: [
                    _summaryRow('Pracovník:', widget.currentUser.name, Colors.white),
                    const SizedBox(height: 6),
                    _summaryRow('Odpracováno (schváleno):', Formatters.formatHours(approvedHours), Colors.white),
                    const SizedBox(height: 6),
                    _summaryRow('Hrubá schválená odměna:', Formatters.formatKcz(approvedAmount), const Color(0xFFD4F73C)),
                    const SizedBox(height: 6),
                    _summaryRow('Vyplacené zálohy:', '-${Formatters.formatKcz(advancesTotal)}', const Color(0xFFFF5B65)),
                    const Divider(color: Color(0xFF232A23), height: 18),
                    _summaryRow(
                      'ČISTÝ DOPLATEK:',
                      Formatters.formatKcz(netPayable),
                      const Color(0xFF10B981),
                      isBold: true,
                    ),
                  ],
                ),
              ),
              if (monthAdvances.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Text(
                  'Přehled záloh v tomto měsíci:',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                ...monthAdvances.map(
                  (adv) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${Formatters.formatDateCz(adv.date)}${adv.note.isNotEmpty ? " · ${adv.note}" : ""}',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        Text(
                          '-${Formatters.formatKcz(adv.amount)}',
                          style: const TextStyle(color: Color(0xFFFF5B65), fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Zavřít'),
          ),
          FilledButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: buffer.toString()));
              if (ctx.mounted) {
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Výplatní lístek a CSV zkopírovány do schránky!')),
                );
              }
            },
            icon: const Icon(Icons.copy, size: 16),
            label: const Text('Zkopírovat výpis / CSV'),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, Color valueColor, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
        Text(
          value,
          style: TextStyle(
            color: valueColor,
            fontWeight: isBold ? FontWeight.w900 : FontWeight.bold,
            fontSize: isBold ? 15 : 13,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final monthKey = Formatters.toMonthKey(_selectedMonth);

    return Scaffold(
      backgroundColor: const Color(0xFF090B0A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090B0A),
        surfaceTintColor: Colors.transparent,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFF1E251E), height: 1),
        ),
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFD4F73C),
                borderRadius: BorderRadius.circular(11),
              ),
              child: const Icon(Icons.access_time_filled, color: Color(0xFF090B0A), size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.currentUser.name,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  Text(
                    'Pracovník · Sazba: ${Formatters.formatKcz(widget.currentUser.defaultHourlyRate)}/h',
                    style: const TextStyle(fontSize: 11, color: Color(0xFFD4F73C)),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, color: Color(0xFFD4F73C)),
            tooltip: 'Sdílet aplikaci',
            onPressed: () {
              showDialog(context: context, builder: (_) => const ShareAppDialog());
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF94A3B8)),
            tooltip: 'Odhlásit se',
            onPressed: () => widget.authService.signOut(),
          ),
        ],
      ),
      body: _buildBody(monthKey),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFF1E251E), width: 1)),
        ),
        child: NavigationBar(
          backgroundColor: const Color(0xFF090B0A),
          indicatorColor: const Color(0xFFD4F73C),
          selectedIndex: _selectedTabIndex,
          onDestinationSelected: (idx) => setState(() => _selectedTabIndex = idx),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.timer_outlined, color: Color(0xFF94A3B8)),
              selectedIcon: Icon(Icons.timer, color: Color(0xFF090B0A)),
              label: 'Moje směny',
            ),
            NavigationDestination(
              icon: Icon(Icons.calendar_month_outlined, color: Color(0xFF94A3B8)),
              selectedIcon: Icon(Icons.calendar_month, color: Color(0xFF090B0A)),
              label: 'Kalendář & Volno',
            ),
            NavigationDestination(
              icon: Icon(Icons.business_center_outlined, color: Color(0xFF94A3B8)),
              selectedIcon: Icon(Icons.business_center, color: Color(0xFF090B0A)),
              label: 'Zakázky & Fotky',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(String monthKey) {
    if (_selectedTabIndex == 1) {
      return AbsenceCalendarView(
        currentUser: widget.currentUser,
        firestoreService: widget.firestoreService,
        isAdminView: false,
      );
    }

    return StreamBuilder<List<ProjectModel>>(
      stream: widget.firestoreService.streamProjects(),
      initialData: widget.firestoreService.getProjectsSync(),
      builder: (context, projectsSnap) {
        final projects = projectsSnap.data ?? [];
        final openProjects = projects.where((p) => p.isOpen).toList();
        if (openProjects.isNotEmpty &&
            (_selectedProjectId == null || !openProjects.any((p) => p.id == _selectedProjectId))) {
          _selectedProjectId = openProjects.first.id;
        }

        return StreamBuilder<List<TimeEntry>>(
          stream: widget.firestoreService.streamWorkerEntries(widget.currentUser.id),
          initialData: widget.firestoreService.getWorkerEntriesSync(widget.currentUser.id),
          builder: (context, entriesSnap) {
            final allEntries = entriesSnap.data ?? [];

            if (_selectedTabIndex == 2) {
              return _buildWorkerProjectsTab(projects, allEntries);
            }

            return StreamBuilder<List<SalaryAdvance>>(
              stream: widget.firestoreService.streamAdvances(userId: widget.currentUser.id),
              initialData: widget.firestoreService.getAdvancesSync(userId: widget.currentUser.id),
              builder: (context, advancesSnap) {
                final allAdvances = advancesSnap.data ?? [];
                final monthAdvances = allAdvances.where((a) => a.monthKey == monthKey).toList();
                final advancesTotal = monthAdvances.fold<double>(0, (sum, a) => sum + a.amount);

                final runningEntry = allEntries.where((e) => e.isRunning).firstOrNull;
                final monthEntries = allEntries.where((e) {
                  return e.date.startsWith(monthKey) && !e.isRunning;
                }).toList();

                double approvedAmount = 0;
                double approvedHours = 0;
                double pendingAmount = 0;
                double pendingHours = 0;

                for (final e in monthEntries) {
                  if (e.isApproved) {
                    approvedAmount += e.totalAmount;
                    approvedHours += e.hoursWorked;
                  } else if (e.isPending) {
                    pendingAmount += e.totalAmount;
                    pendingHours += e.hoursWorked;
                  }
                }

                final netPayable = approvedAmount - advancesTotal;

                return RefreshIndicator(
                  onRefresh: () async => setState(() {}),
                  child: ListView(
                    padding: const EdgeInsets.all(16.0),
                    children: [
                      // 1. KARTA ŽIVÝCH STOPEK (FINTECH CHRONOMETR)
                      _buildStopwatchCard(runningEntry, projects, openProjects),
                      const SizedBox(height: 12),

                      // 1b. VIZUÁLNÍ ČASOVÁ OSA DNEŠNÍHO DNE
                      DayTimelineWidget(entries: allEntries),
                      const SizedBox(height: 16),

                      // 2. PŘEPÍNAČ MĚSÍCŮ A PENĚŽENKA
                      _buildMonthSelector(),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: _buildWalletCard(
                              title: 'SCHVÁLENO CELKEM',
                              amount: approvedAmount,
                              hours: approvedHours,
                              color: const Color(0xFFD4F73C),
                              icon: Icons.check_circle_outline,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildWalletCard(
                              title: 'ČEKÁ NA SCHVÁLENÍ',
                              amount: pendingAmount,
                              hours: pendingHours,
                              color: const Color(0xFFF59E0B),
                              icon: Icons.hourglass_top_outlined,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Karta Čistý doplatek & Zálohy & Výplatní lístek
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF121513),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFF232A23)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Zálohy: -${Formatters.formatKcz(advancesTotal)}',
                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Čistý doplatek: ${Formatters.formatKcz(netPayable)}',
                                    style: const TextStyle(
                                      color: Color(0xFF10B981),
                                      fontWeight: FontWeight.w900,
                                      fontSize: 15,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _showPayslipDialog(
                                monthKey: monthKey,
                                monthEntries: monthEntries,
                                monthAdvances: monthAdvances,
                                approvedAmount: approvedAmount,
                                approvedHours: approvedHours,
                                pendingAmount: pendingAmount,
                                pendingHours: pendingHours,
                                advancesTotal: advancesTotal,
                                netPayable: netPayable,
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFD4F73C),
                                side: const BorderSide(color: Color(0xFF2B392B)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              icon: const Icon(Icons.receipt_long_outlined, size: 16),
                              label: const Text('Výplatní lístek', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // 3. TLAČÍTKO RUČNÍHO ZÁPISU SMĚNY
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => ShiftFormDialog(
                                user: widget.currentUser,
                                projects: projects,
                                firestoreService: widget.firestoreService,
                              ),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFD4F73C),
                            backgroundColor: const Color(0xFF121513),
                            side: const BorderSide(color: Color(0xFF2B392B)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          icon: const Icon(Icons.add_circle_outline, size: 18),
                          label: const Text(
                            'Zapsat směnu ručně',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // 4. SEZNAM SMĚN ZA VYBRANÝ MĚSÍC
                      Text(
                        'Odpracované směny (${monthEntries.length})',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.white),
                      ),
                      const SizedBox(height: 10),

                      if (monthEntries.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(28),
                          decoration: BoxDecoration(
                            color: const Color(0xFF121513),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF232A23)),
                          ),
                          alignment: Alignment.center,
                          child: const Text(
                            'V tomto měsíci zatím nemáte žádné uložené směny.',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                            textAlign: TextAlign.center,
                          ),
                        )
                      else
                        ...monthEntries.map((e) => _buildShiftCard(e, projects)),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildWorkerProjectsTab(List<ProjectModel> projects, List<TimeEntry> myEntries) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Zakázky a fotodokumentace',
          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        const Text(
          'Přehled vašich odpracovaných hodin na zakázkách a fotodokumentace ze stavby',
          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
        ),
        const SizedBox(height: 16),
        ...projects.map((p) {
          final pEntries = myEntries.where((e) => e.projectId == p.id && !e.isRunning).toList();
          final myHours = pEntries.fold<double>(0, (sum, e) => sum + e.hoursWorked);
          final myEarned = pEntries.where((e) => e.isApproved).fold<double>(0, (sum, e) => sum + e.totalAmount);

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF121513),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF232A23)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        p.name,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: p.isOpen
                            ? const Color(0xFFD4F73C).withOpacity(0.14)
                            : const Color(0xFF94A3B8).withOpacity(0.14),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        p.isOpen ? 'Otevřená' : 'Uzavřená',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: p.isOpen ? const Color(0xFFD4F73C) : const Color(0xFF94A3B8),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Klient: ${p.client}',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Moje hodiny: ${Formatters.formatHours(myHours)}',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Text(
                          'Můj schválený výdělek: ${Formatters.formatKcz(myEarned)}',
                          style: const TextStyle(color: Color(0xFFD4F73C), fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    OutlinedButton.icon(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (_) => ProjectPhotosDialog(
                            project: p,
                            currentUser: widget.currentUser,
                            firestoreService: widget.firestoreService,
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFD4F73C),
                        side: const BorderSide(color: Color(0xFF2B392B)),
                      ),
                      icon: const Icon(Icons.photo_camera_outlined, size: 16),
                      label: const Text('Fotky ze stavby'),
                    ),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildStopwatchCard(
    TimeEntry? runningEntry,
    List<ProjectModel> projects,
    List<ProjectModel> openProjects,
  ) {
    if (runningEntry == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF121513),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFF232A23)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFD4F73C),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'CHYTRÝ ČASOMĚŘIČ ZAKÁZEK',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (openProjects.isNotEmpty)
              DropdownButtonFormField<String>(
                value: openProjects.any((p) => p.id == _selectedProjectId)
                    ? _selectedProjectId
                    : openProjects.first.id,
                dropdownColor: const Color(0xFF121513),
                decoration: const InputDecoration(
                  labelText: 'Vyberte otevřenou zakázku',
                  prefixIcon: Icon(Icons.business_center_outlined, color: Color(0xFFD4F73C), size: 18),
                ),
                items: openProjects.map((p) {
                  return DropdownMenuItem(
                    value: p.id,
                    child: Text('${p.name} · ${p.client}', overflow: TextOverflow.ellipsis),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedProjectId = val);
                },
              ),
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              child: FilledButton.icon(
                onPressed: (_isStartingShift || openProjects.isEmpty)
                    ? null
                    : () => _startLiveShiftDirect(projects),
                icon: const Icon(Icons.play_arrow_rounded, size: 22),
                label: Text(_isStartingShift ? 'Spouštím směnu...' : 'Spustit směnu (Start)'),
              ),
            ),
          ],
        ),
      );
    }

    final start = DateTime.parse(runningEntry.startTime);
    final elapsedSec = DateTime.now().difference(start).inSeconds.clamp(0, 86400 * 7);
    final elapsedHours = elapsedSec / 3600.0;
    final currentEarnings = elapsedHours * runningEntry.hourlyRate;

    return Container(
      padding: const EdgeInsets.all(22.0),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD4F73C).withOpacity(0.5), width: 1.5),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: Color(0xFFD4F73C),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'PRÁVĚ PRACUJETE',
                    style: TextStyle(
                      color: Color(0xFFD4F73C),
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  if (runningEntry.startLocation != null)
                    InkWell(
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (_) => GpsLocationDialog(entry: runningEntry),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        margin: const EdgeInsets.only(right: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.location_on, size: 12, color: Color(0xFF10B981)),
                            SizedBox(width: 3),
                            Text('GPS', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  Text(
                    'Od ${Formatters.formatTimeFromIso(runningEntry.startTime)}',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            runningEntry.projectName,
            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 10),
          Text(
            Formatters.formatDuration(elapsedSec),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 38,
              fontWeight: FontWeight.w900,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Naskakující výdělek: ${Formatters.formatKcz(currentEarnings)}',
            style: const TextStyle(
              color: Color(0xFFD4F73C),
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton.icon(
              onPressed: () => _stopLiveShift(runningEntry),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFFF5B65),
                foregroundColor: Colors.white,
              ),
              icon: const Icon(Icons.stop_rounded),
              label: const Text('Ukončit směnu'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, color: Colors.white),
            onPressed: () => _changeMonth(-1),
          ),
          Row(
            children: [
              const Icon(Icons.calendar_month_outlined, size: 18, color: Color(0xFFD4F73C)),
              const SizedBox(width: 8),
              Text(
                Formatters.formatMonthDisplay(_selectedMonth),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right, color: Colors.white),
            onPressed: () => _changeMonth(1),
          ),
        ],
      ),
    );
  }

  Widget _buildWalletCard({
    required String title,
    required double amount,
    required double hours,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(14.0),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF94A3B8),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            Formatters.formatKcz(amount),
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            Formatters.formatHours(hours),
            style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  Widget _buildShiftCard(TimeEntry entry, List<ProjectModel> projects) {
    Color statusColor;
    String statusText;
    IconData statusIcon;

    switch (entry.status) {
      case 'approved':
        statusColor = const Color(0xFFD4F73C);
        statusText = 'Schváleno';
        statusIcon = Icons.check_circle;
        break;
      case 'pending':
        statusColor = const Color(0xFFF59E0B);
        statusText = 'Čeká na schválení';
        statusIcon = Icons.hourglass_empty;
        break;
      case 'rejected':
        statusColor = const Color(0xFFFF5B65);
        statusText = 'Vráceno k opravě';
        statusIcon = Icons.error_outline;
        break;
      default:
        statusColor = const Color(0xFF94A3B8);
        statusText = 'Koncept';
        statusIcon = Icons.edit_note;
    }

    final hasGps = entry.startLocation != null || entry.endLocation != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(15.0),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: entry.isRejected ? const Color(0xFFFF5B65) : const Color(0xFF232A23),
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
                  Text(
                    Formatters.formatDateCz(entry.date),
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  if (hasGps) ...[
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (_) => GpsLocationDialog(entry: entry),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.14),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.location_on, size: 11, color: Color(0xFF10B981)),
                            SizedBox(width: 2),
                            Text('GPS', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 13, color: statusColor),
                    const SizedBox(width: 4),
                    Text(
                      statusText,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            entry.projectName,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                '${Formatters.formatTimeFromIso(entry.startTime)} – ${entry.endTime != null ? Formatters.formatTimeFromIso(entry.endTime!) : "?"}',
                style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
              ),
              if (entry.breakMinutes > 0) ...[
                const SizedBox(width: 8),
                Text(
                  '(pauza ${entry.breakMinutes} min)',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${Formatters.formatHours(entry.hoursWorked)} × ${Formatters.formatKcz(entry.hourlyRate)}/h',
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              Text(
                Formatters.formatKcz(entry.totalAmount),
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFFD4F73C)),
              ),
            ],
          ),
          if (entry.note.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Poznámka: ${entry.note}',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
          if (entry.isRejected && entry.adminComment.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFF5B65).withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFF5B65).withOpacity(0.4)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.comment, size: 16, color: Color(0xFFFF5B65)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Důvod vrácení od šéfa: ${entry.adminComment}',
                      style: const TextStyle(color: Color(0xFFFF5B65), fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (entry.isDraft || entry.isRejected) ...[
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (entry.isDraft)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Color(0xFFFF5B65)),
                    tooltip: 'Smazat koncept',
                    onPressed: () async {
                      await widget.firestoreService.deleteShift(entry.id);
                    },
                  ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF232A23)),
                  ),
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => ShiftFormDialog(
                        user: widget.currentUser,
                        projects: projects,
                        firestoreService: widget.firestoreService,
                        existingEntry: entry,
                      ),
                    );
                  },
                  icon: const Icon(Icons.edit, size: 14),
                  label: const Text('Upravit'),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: () async {
                    await widget.firestoreService.submitDraftForApproval(entry.id);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Směna byla odeslána ke schválení.')),
                      );
                    }
                  },
                  icon: const Icon(Icons.send, size: 14),
                  label: const Text('Odeslat'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
