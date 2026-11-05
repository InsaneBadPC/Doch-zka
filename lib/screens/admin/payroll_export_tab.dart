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
            if (entriesSnap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final allEntries = entriesSnap.data ?? [];

            // Pouze schválené směny v daném měsíci pro výplatní uzávěrku
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
                Card(
                  elevation: 0,
                  color: Colors.grey.shade100,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.chevron_left),
                          onPressed: () => _changeMonth(-1),
                        ),
                        Text(
                          'Uzávěrka za ${Formatters.formatMonthDisplay(_selectedMonth)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chevron_right),
                          onPressed: () => _changeMonth(1),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // CELKOVÁ SUMA VÝPLAT
                Card(
                  color: Colors.indigo.shade900,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      children: [
                        const Text(
                          'CELKOVÉ NÁKLADY NA MZDY FIRMY',
                          style: TextStyle(color: Colors.white70, fontSize: 12, letterSpacing: 1),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          Formatters.formatKcz(totalCompanyCost),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Celkem odpracováno: ${Formatters.formatHours(totalCompanyHours)} ve ${approvedMonthEntries.length} směnách',
                          style: const TextStyle(color: Colors.white70, fontSize: 13),
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
                                        backgroundColor: Colors.green,
                                        content: Text('CSV výkaz zkopírován do schránky (vhodné pro Excel).'),
                                      ),
                                    );
                                  }
                                },
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.greenAccent.shade700,
                            foregroundColor: Colors.white,
                          ),
                          icon: const Icon(Icons.copy),
                          label: const Text('Zkopírovat CSV výkaz pro Excel'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // PŘEHLED JEDNOTLIVÝCH PRACOVNÍKŮ
                const Text(
                  'Rozpis k výplatě po pracovnících',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),

                if (approvedMonthEntries.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(24),
                    alignment: Alignment.center,
                    child: const Text('V tomto měsíci nejsou žádné schválené směny pro výplatu.'),
                  )
                else
                  ...summaryMap.values
                      .where((s) => s.shiftsCount > 0)
                      .map((summary) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: const CircleAvatar(
                                child: Icon(Icons.person),
                              ),
                              title: Text(summary.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text('${summary.shiftsCount} schválených směn | ${Formatters.formatHours(summary.totalHours)}'),
                              trailing: Text(
                                Formatters.formatKcz(summary.totalCost),
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: Colors.green.shade800,
                                ),
                              ),
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
