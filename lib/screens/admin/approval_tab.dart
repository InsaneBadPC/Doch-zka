import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/time_entry.dart';
import '../../services/firestore_service.dart';
import '../../utils/formatters.dart';

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

    return StreamBuilder<List<TimeEntry>>(
      stream: widget.firestoreService.streamAllEntries(),
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
                    label: const Text('Schválit vše'),
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
              ...pendingEntries.map((e) => _buildPendingCard(e)),
          ],
        );
      },
    );
  }

  Widget _buildPendingCard(TimeEntry entry) {
    final isOver12Hours = entry.hoursWorked > 12.0;

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
                child: Text(
                  entry.userName,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
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
            '${Formatters.formatDateCz(entry.date)} | ${Formatters.formatTimeFromIso(entry.startTime)} – ${Formatters.formatTimeFromIso(entry.endTime)} '
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
          if (entry.startLocation != null || entry.endLocation != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0A0D0B),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF232A23)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (entry.startLocation != null)
                    Text(
                      'GPS Start: ${(entry.startLocation!['latitude'] as num?)?.toStringAsFixed(5)}, ${(entry.startLocation!['longitude'] as num?)?.toStringAsFixed(5)}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFFD4F73C)),
                    ),
                  if (entry.endLocation != null)
                    Text(
                      'GPS Konec: ${(entry.endLocation!['latitude'] as num?)?.toStringAsFixed(5)}, ${(entry.endLocation!['longitude'] as num?)?.toStringAsFixed(5)}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                    ),
                ],
              ),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                onPressed: () => _rejectWithComment(entry),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFFF5B65),
                  side: const BorderSide(color: Color(0xFFFF5B65)),
                ),
                icon: const Icon(Icons.reply, size: 16),
                label: const Text('Vrátit'),
              ),
              const SizedBox(width: 10),
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
