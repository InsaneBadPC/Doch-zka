import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/project_model.dart';
import '../../models/salary_advance.dart';
import '../../models/time_entry.dart';
import '../../services/firestore_service.dart';
import '../../utils/csv_exporter.dart';
import '../../utils/formatters.dart';

class PayrollExportTab extends StatefulWidget {
  final FirestoreService firestoreService;

  const PayrollExportTab({
    super.key,
    required this.firestoreService,
  });

  @override
  State<PayrollExportTab> createState() => _PayrollExportTabState();
}

class _PayrollExportTabState extends State<PayrollExportTab> {
  DateTime _selectedMonth = DateTime.now();
  String _filterUserId = 'all';
  String _filterProjectId = 'all';

  void _changeMonth(int delta) {
    setState(() {
      _selectedMonth = DateTime(
        _selectedMonth.year,
        _selectedMonth.month + delta,
        1,
      );
    });
  }

  Future<void> _addAdvanceDialog(String userId, String userName, String monthKey) async {
    final amountCtrl = TextEditingController(text: '2000');
    final noteCtrl = TextEditingController(text: 'Záloha na mzdu');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF121513),
        title: Text(
          'Zapsat zálohu ($userName)',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Částka zálohy (Kč) *'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: noteCtrl,
              decoration: const InputDecoration(labelText: 'Poznámka'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Zrušit')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Uložit zálohu')),
        ],
      ),
    );

    if (confirmed == true) {
      final amt = double.tryParse(amountCtrl.text) ?? 0;
      if (amt > 0) {
        await widget.firestoreService.addAdvance(
          userId: userId,
          userName: userName,
          monthKey: monthKey,
          date: Formatters.toDateKey(DateTime.now()),
          amount: amt,
          note: noteCtrl.text.trim(),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final monthKey = Formatters.toMonthKey(_selectedMonth);

    return StreamBuilder<List<ProjectModel>>(
      stream: widget.firestoreService.streamProjects(),
      initialData: widget.firestoreService.getProjectsSync(),
      builder: (context, projSnap) {
        final projects = projSnap.data ?? [];

        return StreamBuilder<List<AppUser>>(
          stream: widget.firestoreService.streamAllUsers(),
          initialData: widget.firestoreService.getUsersSync(),
          builder: (context, usersSnap) {
            final users = usersSnap.data ?? [];

            return StreamBuilder<List<SalaryAdvance>>(
              stream: widget.firestoreService.streamAdvances(),
              initialData: widget.firestoreService.getAdvancesSync(),
              builder: (context, advSnap) {
                final allAdvances = advSnap.data ?? [];
                final monthAdvances = allAdvances.where((a) => a.monthKey == monthKey).toList();

                return StreamBuilder<List<TimeEntry>>(
                  stream: widget.firestoreService.streamAllEntries(),
                  initialData: widget.firestoreService.getAllEntriesSync(),
                  builder: (context, entriesSnap) {
                    final allEntries = entriesSnap.data ?? [];

                    final approvedMonthEntries = allEntries.where((e) {
                      if (!e.date.startsWith(monthKey) || !e.isApproved) return false;
                      if (_filterUserId != 'all' && e.userId != _filterUserId) return false;
                      if (_filterProjectId != 'all' && e.projectId != _filterProjectId) return false;
                      return true;
                    }).toList();

                    double totalCompanyCost = 0;
                    double totalCompanyHours = 0;

                    final Map<String, _WorkerPayrollSummary> summaryMap = {};
                    for (final u in users) {
                      summaryMap[u.id] = _WorkerPayrollSummary(id: u.id, name: u.name, email: u.email);
                    }

                    for (final e in approvedMonthEntries) {
                      totalCompanyCost += e.totalAmount;
                      totalCompanyHours += e.hoursWorked;

                      if (!summaryMap.containsKey(e.userId)) {
                        summaryMap[e.userId] = _WorkerPayrollSummary(id: e.userId, name: e.userName, email: '');
                      }
                      summaryMap[e.userId]!.totalCost += e.totalAmount;
                      summaryMap[e.userId]!.totalHours += e.hoursWorked;
                      summaryMap[e.userId]!.shiftsCount += 1;
                    }

                    double totalCompanyAdvances = 0;
                    for (final adv in monthAdvances) {
                      if (_filterUserId != 'all' && adv.userId != _filterUserId) continue;
                      totalCompanyAdvances += adv.amount;
                      if (!summaryMap.containsKey(adv.userId)) {
                        summaryMap[adv.userId] = _WorkerPayrollSummary(id: adv.userId, name: adv.userName, email: '');
                      }
                      summaryMap[adv.userId]!.advancesPaid += adv.amount;
                    }

                    final double totalNetPayable = totalCompanyCost - totalCompanyAdvances;

                    return ListView(
                      padding: const EdgeInsets.all(16.0),
                      children: [
                        // PŘEPÍNAČ MĚSÍCE
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                              Text(
                                'Uzávěrka: ${Formatters.formatMonthDisplay(_selectedMonth)}',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white),
                              ),
                              IconButton(
                                icon: const Icon(Icons.chevron_right, color: Colors.white),
                                onPressed: () => _changeMonth(1),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // FILTRY EXPORTU (ZAMĚSTNANEC / ZAKÁZKA)
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: _filterUserId,
                                dropdownColor: const Color(0xFF121513),
                                decoration: const InputDecoration(
                                  labelText: 'Filtr pracovníka',
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: [
                                  const DropdownMenuItem(value: 'all', child: Text('Všichni pracovníci')),
                                  ...users.map((u) => DropdownMenuItem(value: u.id, child: Text(u.name, overflow: TextOverflow.ellipsis))),
                                ],
                                onChanged: (val) {
                                  if (val != null) setState(() => _filterUserId = val);
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: _filterProjectId,
                                dropdownColor: const Color(0xFF121513),
                                decoration: const InputDecoration(
                                  labelText: 'Filtr zakázky',
                                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                items: [
                                  const DropdownMenuItem(value: 'all', child: Text('Všechny zakázky')),
                                  ...projects.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name, overflow: TextOverflow.ellipsis))),
                                ],
                                onChanged: (val) {
                                  if (val != null) setState(() => _filterProjectId = val);
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // CELKOVÁ SUMA VÝPLAT A DOPLATKŮ
                        Container(
                          padding: const EdgeInsets.all(22.0),
                          decoration: BoxDecoration(
                            color: const Color(0xFF121513),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: const Color(0xFF232A23)),
                          ),
                          child: Column(
                            children: [
                              const Text(
                                'CELKOVÉ NÁKLADY NA MZDY FIRMY',
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                Formatters.formatKcz(totalCompanyCost),
                                style: const TextStyle(
                                  color: Color(0xFFD4F73C),
                                  fontSize: 32,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Odpracováno: ${Formatters.formatHours(totalCompanyHours)} ve ${approvedMonthEntries.length} směnách',
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF090B0A),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: const Color(0xFF232A23)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                                  children: [
                                    Column(
                                      children: [
                                        const Text('Vyplacené zálohy', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                        const SizedBox(height: 2),
                                        Text(
                                          '-${Formatters.formatKcz(totalCompanyAdvances)}',
                                          style: const TextStyle(color: Color(0xFFFF5B65), fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                      ],
                                    ),
                                    Container(width: 1, height: 28, color: const Color(0xFF232A23)),
                                    Column(
                                      children: [
                                        const Text('Čistý doplatek k výplatě', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                        const SizedBox(height: 2),
                                        Text(
                                          Formatters.formatKcz(totalNetPayable),
                                          style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontSize: 16),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton.icon(
                                  onPressed: approvedMonthEntries.isEmpty
                                      ? null
                                      : () async {
                                          await CsvExporter.copyToClipboard(approvedMonthEntries);
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(
                                                content: Text('CSV výkaz zkopírován do schránky (pro Excel).'),
                                              ),
                                            );
                                          }
                                        },
                                  icon: const Icon(Icons.copy, size: 18),
                                  label: const Text('Zkopírovat CSV výkaz pro Excel'),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        const Text(
                          'Rozpis k výplatě po pracovnících',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                        const SizedBox(height: 10),

                        if (summaryMap.values.where((s) => s.shiftsCount > 0 || s.advancesPaid > 0).isEmpty)
                          Container(
                            padding: const EdgeInsets.all(28),
                            decoration: BoxDecoration(
                              color: const Color(0xFF121513),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: const Color(0xFF232A23)),
                            ),
                            alignment: Alignment.center,
                            child: const Text(
                              'V tomto měsíci nejsou žádné schválené směny ani zálohy pro výplatu.',
                              style: TextStyle(color: Color(0xFF94A3B8)),
                              textAlign: TextAlign.center,
                            ),
                          )
                        else
                          ...summaryMap.values
                              .where((s) => s.shiftsCount > 0 || s.advancesPaid > 0)
                              .map((summary) {
                            final net = summary.totalCost - summary.advancesPaid;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFF121513),
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(color: const Color(0xFF232A23)),
                              ),
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFD4F73C).withOpacity(0.15),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: const Icon(Icons.person, color: Color(0xFFD4F73C)),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              summary.name,
                                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15),
                                            ),
                                            Text(
                                              '${summary.shiftsCount} směn · ${Formatters.formatHours(summary.totalHours)}',
                                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                            ),
                                          ],
                                        ),
                                      ),
                                      OutlinedButton.icon(
                                        onPressed: () => _addAdvanceDialog(summary.id, summary.name, monthKey),
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: const Color(0xFFD4F73C),
                                          side: const BorderSide(color: Color(0xFF2B392B)),
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        ),
                                        icon: const Icon(Icons.add, size: 14),
                                        label: const Text('Záloha', style: TextStyle(fontSize: 11)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF090B0A),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Schváleno: ${Formatters.formatKcz(summary.totalCost)}',
                                          style: const TextStyle(color: Colors.white70, fontSize: 11),
                                        ),
                                        Text(
                                          'Zálohy: -${Formatters.formatKcz(summary.advancesPaid)}',
                                          style: const TextStyle(color: Color(0xFFFF5B65), fontSize: 11),
                                        ),
                                        Text(
                                          'Doplatek: ${Formatters.formatKcz(net)}',
                                          style: const TextStyle(
                                            color: Color(0xFF10B981),
                                            fontWeight: FontWeight.w900,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                      ],
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  }
}

class _WorkerPayrollSummary {
  final String id;
  final String name;
  final String email;
  double totalCost = 0;
  double totalHours = 0;
  double advancesPaid = 0;
  int shiftsCount = 0;

  _WorkerPayrollSummary({required this.id, required this.name, required this.email});
}
