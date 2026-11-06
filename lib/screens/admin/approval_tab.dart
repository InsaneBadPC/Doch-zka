import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/project_model.dart';
import '../../models/time_entry.dart';
import '../../services/firestore_service.dart';
import '../../utils/formatters.dart';
import '../common/gps_location_dialog.dart';

class ApprovalTab extends StatefulWidget {
  final AppUser currentUser;
  final FirestoreService firestoreService;

  const ApprovalTab({
    super.key,
    required this.currentUser,
    required this.firestoreService,
  });

  @override
  State<ApprovalTab> createState() => _ApprovalTabState();
}

class _ApprovalTabState extends State<ApprovalTab> {
  bool _isBatchProcessing = false;

  Future<void> _approveAll(List<TimeEntry> pendingEntries) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hromadně schválit vše?', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        content: Text('Chystáte se jedním kliknutím schválit všech ${pendingEntries.length} čekajících směn.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Zrušit')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Schválit vše')),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isBatchProcessing = true);
    try {
      final count = await widget.firestoreService.batchApproveAll(
        pendingEntries,
        widget.currentUser.id,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Úspěšně schváleno $count směn.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Chyba při hromadném schvalování: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isBatchProcessing = false);
    }
  }

  Future<void> _adminEditShiftDialog(TimeEntry entry, List<ProjectModel> projects) async {
    ProjectModel selectedProject = projects.where((p) => p.id == entry.projectId).firstOrNull ??
        ProjectModel(
          id: entry.projectId,
          name: entry.projectName,
          client: '',
          budgetLimitKcz: 0,
          status: 'open',
          createdAt: '',
        );

    DateTime startDt = DateTime.tryParse(entry.startTime) ?? DateTime.now();
    DateTime endDt = DateTime.tryParse(entry.endTime ?? '') ?? startDt.add(const Duration(hours: 8));
    TimeOfDay startTod = TimeOfDay(hour: startDt.hour, minute: startDt.minute);
    TimeOfDay endTod = TimeOfDay(hour: endDt.hour, minute: endDt.minute);
    int breakMinutes = entry.breakMinutes;
    final rateCtrl = TextEditingController(text: entry.hourlyRate.toStringAsFixed(0));
    final noteCtrl = TextEditingController(text: entry.note);

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final s = DateTime(startDt.year, startDt.month, startDt.day, startTod.hour, startTod.minute);
          DateTime e = DateTime(startDt.year, startDt.month, startDt.day, endTod.hour, endTod.minute);
          if (e.isBefore(s)) e = e.add(const Duration(days: 1));
          final netMin = (e.difference(s).inMinutes - breakMinutes).clamp(0, 24 * 60);
          final hrs = netMin / 60.0;
          final rate = double.tryParse(rateCtrl.text) ?? entry.hourlyRate;
          final total = hrs * rate;

          return AlertDialog(
            backgroundColor: const Color(0xFF121513),
            title: Text(
              'Upravit směnu (${entry.userName})',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (projects.isNotEmpty)
                    DropdownButtonFormField<String>(
                      value: projects.any((p) => p.id == selectedProject.id)
                          ? selectedProject.id
                          : projects.first.id,
                      dropdownColor: const Color(0xFF121513),
                      decoration: const InputDecoration(labelText: 'Zakázka'),
                      items: projects
                          .map((p) => DropdownMenuItem(value: p.id, child: Text(p.name, overflow: TextOverflow.ellipsis)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setDialogState(() {
                            selectedProject = projects.firstWhere((p) => p.id == val);
                          });
                        }
                      },
                    ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            final picked = await showTimePicker(context: ctx, initialTime: startTod);
                            if (picked != null) setDialogState(() => startTod = picked);
                          },
                          child: Text('Od: ${startTod.format(ctx)}'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            final picked = await showTimePicker(context: ctx, initialTime: endTod);
                            if (picked != null) setDialogState(() => endTod = picked);
                          },
                          child: Text('Do: ${endTod.format(ctx)}'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    value: [0, 15, 30, 45, 60].contains(breakMinutes) ? breakMinutes : 0,
                    dropdownColor: const Color(0xFF121513),
                    decoration: const InputDecoration(labelText: 'Pauza'),
                    items: const [
                      DropdownMenuItem(value: 0, child: Text('0 min')),
                      DropdownMenuItem(value: 15, child: Text('15 min')),
                      DropdownMenuItem(value: 30, child: Text('30 min')),
                      DropdownMenuItem(value: 45, child: Text('45 min')),
                      DropdownMenuItem(value: 60, child: Text('60 min')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => breakMinutes = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: rateCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Hodinová sazba (Kč/h)'),
                    onChanged: (_) => setDialogState(() {}),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: noteCtrl,
                    decoration: const InputDecoration(labelText: 'Poznámka ke směně'),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF090B0A),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF232A23)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Čistý čas: ${Formatters.formatHours(hrs)}', style: const TextStyle(color: Colors.white)),
                        Text(
                          Formatters.formatKcz(total),
                          style: const TextStyle(color: Color(0xFFD4F73C), fontWeight: FontWeight.w900, fontSize: 15),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Zrušit')),
              FilledButton.icon(
                onPressed: () => Navigator.of(ctx).pop(true),
                icon: const Icon(Icons.check, size: 16),
                label: const Text('Uložit a schválit'),
              ),
            ],
          );
        },
      ),
    );

    if (result == true) {
      final s = DateTime(startDt.year, startDt.month, startDt.day, startTod.hour, startTod.minute);
      DateTime e = DateTime(startDt.year, startDt.month, startDt.day, endTod.hour, endTod.minute);
      if (e.isBefore(s)) e = e.add(const Duration(days: 1));
      final rate = double.tryParse(rateCtrl.text) ?? entry.hourlyRate;
      final netMin = (e.difference(s).inMinutes - breakMinutes).clamp(0, 24 * 60);
      final hrs = double.parse((netMin / 60.0).toStringAsFixed(2));
      final total = double.parse((hrs * rate).toStringAsFixed(2));

      final updatedEntry = entry.copyWith(
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        date: Formatters.toDateKey(s),
        startTime: s.toIso8601String(),
        endTime: e.toIso8601String(),
        breakMinutes: breakMinutes,
        hoursWorked: hrs,
        hourlyRate: rate,
        totalAmount: total,
        note: noteCtrl.text.trim(),
      );

      await widget.firestoreService.adminUpdateShift(
        updatedEntry,
        approveImmediately: true,
        adminUid: widget.currentUser.id,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Směna byla upravena a schválena.')),
        );
      }
    }
  }

  Future<void> _rejectWithComment(TimeEntry entry) async {
    final commentController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Vrátit směnu k opravě', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Pracovník: ${entry.userName}'),
              Text('Zakázka: ${entry.projectName} (${entry.date})'),
              const SizedBox(height: 12),
              TextFormField(
                controller: commentController,
                decoration: const InputDecoration(
                  labelText: 'Důvod vrácení (komentář pro pracovníka) *',
                ),
                maxLines: 3,
                validator: (val) => val == null || val.trim().isEmpty ? 'Vyplňte prosím důvod' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Zrušit')),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.of(ctx).pop(true);
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFFF5B65),
              foregroundColor: Colors.white,
            ),
            child: const Text('Vrátit směnu'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await widget.firestoreService.rejectShift(
        entryId: entry.id,
        reason: commentController.text,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Směna byla vrácena pracovníkovi s komentářem.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final monthKey = Formatters.toMonthKey(DateTime.now());

    return StreamBuilder<List<ProjectModel>>(
      stream: widget.firestoreService.streamProjects(),
      initialData: widget.firestoreService.getProjectsSync(),
      builder: (context, projSnap) {
        final projects = projSnap.data ?? [];

        return StreamBuilder<List<TimeEntry>>(
          stream: widget.firestoreService.streamAllEntries(),
          initialData: widget.firestoreService.getAllEntriesSync(),
          builder: (context, snapshot) {
            final allEntries = snapshot.data ?? [];
            final pendingEntries = allEntries.where((e) => e.isPending).toList();
            final approvedMonth = allEntries.where((e) => e.isApproved && e.date.startsWith(monthKey)).toList();

            double totalPayroll = 0;
            double totalHours = 0;
            for (final e in approvedMonth) {
              totalPayroll += e.totalAmount;
              totalHours += e.hoursWorked;
            }

            return ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                // HERO FINTECH PŘEHLED FIRMY
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF121513),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFF232A23)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
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
                      const SizedBox(height: 6),
                      Text(
                        Formatters.formatKcz(totalPayroll),
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFFD4F73C),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text(
                            'Odpracováno: ${Formatters.formatHours(totalHours)}',
                            style: const TextStyle(fontSize: 12, color: Colors.white),
                          ),
                          const SizedBox(width: 14),
                          Text(
                            'Ke schválení: ${pendingEntries.length}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: pendingEntries.isNotEmpty ? const Color(0xFFFF5B65) : const Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // HLAVIČKA A HROMADNÉ SCHVÁLENÍ
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Fronta ke schválení',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                        ),
                        Text(
                          'Čeká: ${pendingEntries.length} směn',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                    if (pendingEntries.isNotEmpty)
                      FilledButton.icon(
                        onPressed: _isBatchProcessing ? null : () => _approveAll(pendingEntries),
                        icon: _isBatchProcessing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF090B0A)),
                              )
                            : const Icon(Icons.done_all, size: 18),
                        label: Text('Schválit vše (${pendingEntries.length})'),
                      ),
                  ],
                ),
                const SizedBox(height: 14),

                if (pendingEntries.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(36),
                    decoration: BoxDecoration(
                      color: const Color(0xFF121513),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF232A23)),
                    ),
                    alignment: Alignment.center,
                    child: const Column(
                      children: [
                        Icon(Icons.check_circle_outline, size: 52, color: Color(0xFFD4F73C)),
                        SizedBox(height: 12),
                        Text(
                          'Vše je schváleno!',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Aktuálně nečeká žádná směna na vaše schválení.',
                          style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  )
                else
                  ...pendingEntries.map((e) => _buildPendingCard(e, projects)),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildPendingCard(TimeEntry entry, List<ProjectModel> projects) {
    final isOver12Hours = entry.hoursWorked > 12.0;
    final hasGps = entry.startLocation != null || entry.endLocation != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16.0),
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
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        entry.userName,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
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
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.location_on, size: 12, color: Color(0xFF10B981)),
                              SizedBox(width: 3),
                              Text('GPS ověření', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Text(
                Formatters.formatKcz(entry.totalAmount),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFFD4F73C),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Zakázka: ${entry.projectName}',
            style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFCBD5E1), fontSize: 13),
          ),
          const SizedBox(height: 4),
          Text(
            '${Formatters.formatDateCz(entry.date)} | ${Formatters.formatTimeFromIso(entry.startTime)} – ${Formatters.formatTimeFromIso(entry.endTime ?? '')} '
            '(pauza ${entry.breakMinutes}m) = ${Formatters.formatHours(entry.hoursWorked)} @ ${entry.hourlyRate.toStringAsFixed(0)} Kč/h',
            style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
          ),
          if (entry.isCustomRate || isOver12Hours) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                if (entry.isCustomRate)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Upravená hodinová sazba',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFF59E0B)),
                    ),
                  ),
                if (isOver12Hours)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF5B65).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Směna delší než 12 hodin',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFFF5B65)),
                    ),
                  ),
              ],
            ),
          ],
          if (entry.note.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0A0D0B),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Poznámka: ${entry.note}',
                style: const TextStyle(fontSize: 12, color: Color(0xFFCBD5E1)),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            alignment: WrapAlignment.end,
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () => _rejectWithComment(entry),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFFF5B65),
                  side: const BorderSide(color: Color(0xFFFF5B65)),
                ),
                icon: const Icon(Icons.reply, size: 15),
                label: const Text('Vrátit'),
              ),
              OutlinedButton.icon(
                onPressed: () => _adminEditShiftDialog(entry, projects),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFF232A23)),
                ),
                icon: const Icon(Icons.edit_outlined, size: 15),
                label: const Text('Upravit'),
              ),
              FilledButton.icon(
                onPressed: () async {
                  await widget.firestoreService.approveShift(
                    entryId: entry.id,
                    adminUid: widget.currentUser.id,
                  );
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Směna schválena.')),
                    );
                  }
                },
                icon: const Icon(Icons.check, size: 16),
                label: const Text('Schválit'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
