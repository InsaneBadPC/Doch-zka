import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/project_model.dart';
import '../../models/time_entry.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../services/location_service.dart';
import '../../utils/formatters.dart';
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
  DateTime _selectedMonth = DateTime.now();
  Timer? _ticker;
  int _runningSeconds = 0;

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

  Future<void> _startLiveShift(List<ProjectModel> projects) async {
    final openProjects = projects.where((p) => p.isOpen).toList();
    if (openProjects.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nejsou k dispozici žádné otevřené zakázky.')),
      );
      return;
    }

    String selectedId = openProjects.first.id;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Spustit stopky směny'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Vyberte zakázku, na které začínáte pracovat:'),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: selectedId,
                decoration: const InputDecoration(
                  labelText: 'Otevřená zakázka',
                  border: OutlineInputBorder(),
                ),
                items: openProjects.map((p) {
                  return DropdownMenuItem(
                    value: p.id,
                    child: Text('${p.name} (${p.client})'),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setDialogState(() => selectedId = val);
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Zrušit'),
            ),
            FilledButton.icon(
              onPressed: () => Navigator.of(ctx).pop(true),
              icon: const Icon(Icons.play_arrow),
              label: const Text('Spustit stopky'),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      final project = openProjects.firstWhere((p) => p.id == selectedId);
      try {
        final loc = await LocationService.getCurrentLocation();
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
      }
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
            title: const Text('Ukončit běžící směnu'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Zakázka: ${runningEntry.projectName}'),
                  Text('Začátek: ${Formatters.formatTimeFromIso(runningEntry.startTime)} | Konec: ${Formatters.formatTimeFromIso(now.toIso8601String())}'),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<int>(
                    value: breakMinutes,
                    decoration: const InputDecoration(
                      labelText: 'Pauza',
                      border: OutlineInputBorder(),
                    ),
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
                      decoration: const InputDecoration(
                        labelText: 'Hodinová sazba (Kč)',
                        border: OutlineInputBorder(),
                      ),
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
                    decoration: const InputDecoration(
                      labelText: 'Poznámka / vykonaná práce',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Čistý čas: ${Formatters.formatHours(hours)}'),
                        Text(
                          Formatters.formatKcz(amount),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
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
                child: const Text('Zpět ke stopkám'),
              ),
              OutlinedButton(
                onPressed: () => Navigator.of(ctx).pop({'submit': false, 'break': breakMinutes, 'rate': hourlyRate, 'note': noteController.text}),
                child: const Text('Uložit návrh'),
              ),
              FilledButton.icon(
                onPressed: () => Navigator.of(ctx).pop({'submit': true, 'break': breakMinutes, 'rate': hourlyRate, 'note': noteController.text}),
                icon: const Icon(Icons.send, size: 16),
                label: const Text('Odeslat ke schválení'),
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
              backgroundColor: Colors.red,
              content: Text('Kolize! Čas směny se překrývá s jiným záznamem.'),
            ),
          );
        }
        return;
      }

      final loc = await LocationService.getCurrentLocation();
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final monthKey = Formatters.toMonthKey(_selectedMonth);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.currentUser.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text(
              'Pracovník | Sazba: ${Formatters.formatKcz(widget.currentUser.defaultHourlyRate)}/h',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Odhlásit se',
            onPressed: () => widget.authService.signOut(),
          ),
        ],
      ),
      body: StreamBuilder<List<ProjectModel>>(
        stream: widget.firestoreService.streamProjects(),
        builder: (context, projectsSnap) {
          final projects = projectsSnap.data ?? [];

          return StreamBuilder<List<TimeEntry>>(
            stream: widget.firestoreService.streamWorkerEntries(widget.currentUser.id),
            builder: (context, entriesSnap) {
              if (entriesSnap.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final allEntries = entriesSnap.data ?? [];
              final runningEntry = allEntries.where((e) => e.isRunning).firstOrNull;

              // Filtrování záznamů v paměti na vybraný měsíc (YYYY-MM)
              final monthEntries = allEntries.where((e) {
                return e.date.startsWith(monthKey) && !e.isRunning;
              }).toList();

              // Výpočty pro peněženku
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

              return RefreshIndicator(
                onRefresh: () async => setState(() {}),
                child: ListView(
                  padding: const EdgeInsets.all(16.0),
                  children: [
                    // KARTA ŽIVÝCH STOPEK
                    _buildStopwatchCard(runningEntry, projects),
                    const SizedBox(height: 16),

                    // PŘEPÍNAČ MĚSÍCŮ
                    _buildMonthSelector(),
                    const SizedBox(height: 12),

                    // ŽIVÁ PENĚŽENKA (2 karty vedle sebe)
                    Row(
                      children: [
                        Expanded(
                          child: _buildWalletCard(
                            title: 'SCHVÁLENO K VÝPLATĚ',
                            amount: approvedAmount,
                            hours: approvedHours,
                            color: Colors.green, // robust material green
                            icon: Icons.check_circle_outline,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildWalletCard(
                            title: 'ČEKÁ NA SCHVÁLENÍ',
                            amount: pendingAmount,
                            hours: pendingHours,
                            color: Colors.orange,
                            icon: Icons.hourglass_top_outlined,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // TLAČÍTKO RUČNÍHO ZÁPISU SMĚNY
                    FilledButton.tonalIcon(
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
                      icon: const Icon(Icons.add_circle_outline),
                      label: const Text('Zapsat směnu ručně / rozpad dne'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // SEZNAM SMĚN ZA VYBRANÝ MĚSÍC
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Směny za ${Formatters.formatMonthDisplay(_selectedMonth)} (${monthEntries.length})',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    if (monthEntries.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        alignment: Alignment.center,
                        child: Text(
                          'V tomto měsíci nemáte žádné uložené směny.',
                          style: TextStyle(color: Colors.grey.shade600),
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
      ),
    );
  }

  Widget _buildStopwatchCard(TimeEntry? runningEntry, List<ProjectModel> projects) {
    if (runningEntry == null) {
      return Card(
        color: Colors.blueGrey.shade900,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              const Row(
                children: [
                  Icon(Icons.timer_outlined, color: Colors.white70),
                  SizedBox(width: 8),
                  Text(
                    'Živé stopky příchodu',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Nyní nemáte spuštěnou žádnou směnu.',
                style: TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => _startLiveShift(projects),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.green.shade600,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Spustit směnu (Start)'),
              ),
            ],
          ),
        ),
      );
    }

    // Stopky běží!
    final start = DateTime.parse(runningEntry.startTime);
    final elapsedSec = DateTime.now().difference(start).inSeconds;
    final elapsedHours = elapsedSec / 3600.0;
    final currentEarnings = elapsedHours * runningEntry.hourlyRate;

    return Card(
      color: Colors.teal.shade900,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
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
                        color: Colors.greenAccent,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'PRÁVĚ PRACUJETE',
                      style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, letterSpacing: 1),
                    ),
                  ],
                ),
                Text(
                  'Od ${Formatters.formatTimeFromIso(runningEntry.startTime)}',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              runningEntry.projectName,
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              Formatters.formatDuration(elapsedSec),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 36,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Aktuální výdělek: ${Formatters.formatKcz(currentEarnings)}',
              style: const TextStyle(color: Colors.greenAccent, fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => _stopLiveShift(runningEntry),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.redAccent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              icon: const Icon(Icons.stop),
              label: const Text('Ukončit směnu'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthSelector() {
    return Card(
      elevation: 0,
      color: Colors.grey.shade100,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left),
              onPressed: () => _changeMonth(-1),
            ),
            Row(
              children: [
                const Icon(Icons.calendar_month_outlined, size: 20, color: Colors.blueGrey),
                const SizedBox(width: 8),
                Text(
                  Formatters.formatMonthDisplay(_selectedMonth),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: () => _changeMonth(1),
            ),
          ],
        ),
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
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: color),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
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
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              Formatters.formatHours(hours),
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShiftCard(TimeEntry entry, List<ProjectModel> projects) {
    Color statusColor;
    String statusText;
    IconData statusIcon;

    switch (entry.status) {
      case 'approved':
        statusColor = Colors.green;
        statusText = 'Schváleno';
        statusIcon = Icons.check_circle;
        break;
      case 'pending':
        statusColor = Colors.orange;
        statusText = 'Čeká na schválení';
        statusIcon = Icons.hourglass_empty;
        break;
      case 'rejected':
        statusColor = Colors.red;
        statusText = 'Vráceno k opravě';
        statusIcon = Icons.error_outline;
        break;
      default:
        statusColor = Colors.blueGrey;
        statusText = 'Rozpracováno (Koncept)';
        statusIcon = Icons.edit_note;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: entry.isRejected
            ? const BorderSide(color: Colors.red, width: 1.5)
            : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  Formatters.formatDateCz(entry.date),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 14, color: statusColor),
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
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  '${Formatters.formatTimeFromIso(entry.startTime)} – ${entry.endTime != null ? Formatters.formatTimeFromIso(entry.endTime!) : "?"}',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
                if (entry.breakMinutes > 0) ...[
                  const SizedBox(width: 8),
                  Text('(pauza ${entry.breakMinutes} min)', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                ],
              ],
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${Formatters.formatHours(entry.hoursWorked)} × ${Formatters.formatKcz(entry.hourlyRate)}/h'),
                Text(
                  Formatters.formatKcz(entry.totalAmount),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
            if (entry.note.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                'Poznámka: ${entry.note}',
                style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey.shade600, fontSize: 12),
              ),
            ],

            if (entry.startLocation != null || entry.endLocation != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.location_on, size: 14, color: Colors.blue.shade600),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      [
                        if (entry.startLocation != null)
                          'GPS Start: ${(entry.startLocation!['latitude'] as num).toStringAsFixed(4)}, ${(entry.startLocation!['longitude'] as num).toStringAsFixed(4)}',
                        if (entry.endLocation != null)
                          'GPS Konec: ${(entry.endLocation!['latitude'] as num).toStringAsFixed(4)}, ${(entry.endLocation!['longitude'] as num).toStringAsFixed(4)}',
                      ].join(' | '),
                      style: TextStyle(color: Colors.blue.shade800, fontSize: 11),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],

            // Komentář šéfa při vrácení
            if (entry.isRejected && entry.adminComment.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.comment, size: 16, color: Colors.red),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Důvod vrácení od šéfa: ${entry.adminComment}',
                        style: TextStyle(color: Colors.red.shade900, fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Akce u draft a rejected
            if (entry.isDraft || entry.isRejected) ...[
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (entry.isDraft)
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      tooltip: 'Smazat koncept',
                      onPressed: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Smazat koncept?'),
                            content: const Text('Opravdu chcete tento rozpracovaný záznam smazat?'),
                            actions: [
                              TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Ne')),
                              FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Smazat')),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          await widget.firestoreService.deleteShift(entry.id);
                        }
                      },
                    ),
                  OutlinedButton.icon(
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
                    label: const Text('Odeslat ke schválení'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
