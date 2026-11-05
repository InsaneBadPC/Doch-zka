import 'package:flutter/material.dart';
import '../../models/app_user.dart';
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

  void _changeMonth(int delta) {
    setState(() {
      _selectedMonth = DateTime(
        _selectedMonth.year,
        _selectedMonth.month + delta,
        1,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final monthKey = Formatters.toMonthKey(_selectedMonth);

    return StreamBuilder<List<AppUser>>(
      stream: widget.firestoreService.streamAllUsers(),
      builder: (context, usersSnap) {
        final users = usersSnap.data ?? [];

        return StreamBuilder<List<TimeEntry>>(
          stream: widget.firestoreService.streamAllEntries(),
          builder: (context, entriesSnap) {
            final allEntries = entriesSnap.data ?? [];

            final approvedMonthEntries = allEntries
                .where((e) => e.date.startsWith(monthKey) && e.isApproved)
                .toList();

            double totalCompanyCost = 0;
            double totalCompanyHours = 0;

            final Map<String, _WorkerPayrollSummary> summaryMap = {};
            for (final u in users) {
              summaryMap[u.id] = _WorkerPayrollSummary(name: u.name, email: u.email);
            }

            for (final e in approvedMonthEntries) {
              totalCompanyCost += e.totalAmount;
              totalCompanyHours += e.hoursWorked;

              if (!summaryMap.containsKey(e.userId)) {
                summaryMap[e.userId] = _WorkerPayrollSummary(name: e.userName, email: '');
              }
              summaryMap[e.userId]!.totalCost += e.totalAmount;
              summaryMap[e.userId]!.totalHours += e.hoursWorked;
              summaryMap[e.userId]!.shiftsCount += 1;
            }

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
                const SizedBox(height: 14),

                // CELKOVÁ SUMA VÝPLAT
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
                      const SizedBox(height: 16),
                      FilledButton.icon(
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
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                const Text(
                  'Rozpis k výplatě po pracovnících',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                const SizedBox(height: 10),

                if (approvedMonthEntries.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: const Color(0xFF121513),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFF232A23)),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'V tomto měsíci nejsou žádné schválené směny pro výplatu.',
                      style: TextStyle(color: Color(0xFF94A3B8)),
                      textAlign: TextAlign.center,
                    ),
                  )
                else
                  ...summaryMap.values
                      .where((s) => s.shiftsCount > 0)
                      .map((summary) => Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFF121513),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: const Color(0xFF232A23)),
                            ),
                            child: Row(
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
                                        '${summary.shiftsCount} schválených směn · ${Formatters.formatHours(summary.totalHours)}',
                                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  Formatters.formatKcz(summary.totalCost),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: Color(0xFFD4F73C),
                                  ),
                                ),
                              ],
                            ),
                          )),
              ],
            );
          },
        );
      },
    );
  }
}

class _WorkerPayrollSummary {
  final String name;
  final String email;
  double totalCost = 0;
  double totalHours = 0;
  int shiftsCount = 0;

  _WorkerPayrollSummary({required this.name, required this.email});
}
