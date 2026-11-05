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
        title: const Text('Hromadně schválit vše?'),
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
        title: const Text('Vrátit směnu k opravě'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Pracovník: ${entry.userName}'),
              Text('Zakázka: ${entry.projectName} (${entry.date})'),
              const SizedBox(height: 12),
              TextFormField(
                controller: commentController,
                decoration: const InputDecoration(
                  labelText: 'Důvod vrácení (komentář pro pracovníka) *',
                  border: OutlineInputBorder(),
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
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
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
    return StreamBuilder<List<TimeEntry>>(
      stream: widget.firestoreService.streamAllEntries(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final allEntries = snapshot.data ?? [];
        final pendingEntries = allEntries.where((e) => e.isPending).toList();

        return ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // HLAVIČKA A HROMADNÉ SCHVÁLENÍ
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Fronta ke schválení',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'Čeká: ${pendingEntries.length} směn',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ),
                if (pendingEntries.isNotEmpty)
                  FilledButton.icon(
                    onPressed: _isBatchProcessing ? null : () => _approveAll(pendingEntries),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.green.shade700,
                    ),
                    icon: _isBatchProcessing
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.done_all),
                    label: const Text('Hromadně schválit vše'),
                  ),
              ],
            ),
            const SizedBox(height: 16),

            if (pendingEntries.isEmpty)
              Container(
                padding: const EdgeInsets.all(40),
                alignment: Alignment.center,
                child: Column(
                  children: [
                    Icon(Icons.check_circle_outline, size: 64, color: Colors.green.shade300),
                    const SizedBox(height: 12),
                    const Text(
                      'Vše je schváleno!',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Aktuálně nečeká žádná směna na vaše schválení.',
                      style: TextStyle(color: Colors.grey.shade600),
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

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Pracovník a datum
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  entry.userName,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  Formatters.formatDateCz(entry.date),
                  style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w500),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Zakázka: ${entry.projectName}',
              style: TextStyle(color: Colors.blueGrey.shade800, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              'Čas: ${Formatters.formatTimeFromIso(entry.startTime)} – ${entry.endTime != null ? Formatters.formatTimeFromIso(entry.endTime!) : "?"} (pauza ${entry.breakMinutes} min)',
              style: TextStyle(color: Colors.grey.shade700),
            ),
            const SizedBox(height: 6),

            // ANOMÁLIE DETEKCE: ŠTÍTKY
            if (entry.isCustomRate || isOver12Hours) ...[
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  if (entry.isCustomRate)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        border: Border.all(color: Colors.amber.shade800),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.warning_amber_rounded, size: 14, color: Colors.amber.shade900),
                          const SizedBox(width: 4),
                          Text(
                            'Upravená sazba!',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                          ),
                        ],
                      ),
                    ),
                  if (isOver12Hours)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.red.shade100,
                        border: Border.all(color: Colors.red.shade800),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.timer_off_outlined, size: 14, color: Colors.red.shade900),
                          const SizedBox(width: 4),
                          Text(
                            'Směna přes 12 h!',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red.shade900),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
            ],

            // Hodiny, sazba a částka
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${Formatters.formatHours(entry.hoursWorked)} × ${Formatters.formatKcz(entry.hourlyRate)}/h',
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  Formatters.formatKcz(entry.totalAmount),
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.green.shade800,
                  ),
                ),
              ],
            ),

            if (entry.note.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                'Poznámka: ${entry.note}',
                style: TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: Colors.grey.shade700),
              ),
            ],

            const Divider(height: 20),

            // Tlačítka Schválit / Vrátit
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  onPressed: () => _rejectWithComment(entry),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                  ),
                  icon: const Icon(Icons.close, size: 16),
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
                        const SnackBar(content: Text('Směna byla schválena.')),
                      );
                    }
                  },
                  style: FilledButton.styleFrom(backgroundColor: Colors.green.shade700),
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text('Schválit'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
