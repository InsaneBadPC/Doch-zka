import 'package:flutter/material.dart';
import '../../models/project_model.dart';
import '../../models/time_entry.dart';
import '../../services/firestore_service.dart';
import '../../utils/formatters.dart';

class ProjectsTab extends StatefulWidget {
  final FirestoreService firestoreService;

  const ProjectsTab({
    super.key,
    required this.firestoreService,
  });

  @override
  State<ProjectsTab> createState() => _ProjectsTabState();
}

class _ProjectsTabState extends State<ProjectsTab> {
  Future<void> _createProjectDialog() async {
    final nameCtrl = TextEditingController();
    final clientCtrl = TextEditingController();
    final budgetCtrl = TextEditingController(text: '50000');
    final formKey = GlobalKey<FormState>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nová zakázka'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Název zakázky *', border: OutlineInputBorder()),
                validator: (val) => val == null || val.trim().isEmpty ? 'Zadejte název' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: clientCtrl,
                decoration: const InputDecoration(labelText: 'Zákazník / Firma *', border: OutlineInputBorder()),
                validator: (val) => val == null || val.trim().isEmpty ? 'Zadejte zákazníka' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: budgetCtrl,
                decoration: const InputDecoration(labelText: 'Mzdový rozpočet (Kč) *', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
                validator: (val) => (val == null || double.tryParse(val) == null) ? 'Zadejte platnou částku' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Zrušit')),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) Navigator.of(ctx).pop(true);
            },
            child: const Text('Vytvořit zakázku'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await widget.firestoreService.createProject(
        name: nameCtrl.text,
        client: clientCtrl.text,
        budgetLimitKcz: double.parse(budgetCtrl.text),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Zakázka byla úspěšně založena.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<ProjectModel>>(
      stream: widget.firestoreService.streamProjects(),
      builder: (context, projSnap) {
        if (projSnap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final projects = projSnap.data ?? [];

        return StreamBuilder<List<TimeEntry>>(
          stream: widget.firestoreService.streamAllEntries(),
          builder: (context, entriesSnap) {
            final allEntries = entriesSnap.data ?? [];

            return ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Správa zakázek (${projects.length})',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    FilledButton.icon(
                      onPressed: _createProjectDialog,
                      icon: const Icon(Icons.add),
                      label: const Text('Přidat zakázku'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (projects.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text('Zatím nejsou vytvořeny žádné zakázky.'),
                    ),
                  )
                else
                  ...projects.map((p) => _buildProjectCard(p, allEntries)),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildProjectCard(ProjectModel project, List<TimeEntry> allEntries) {
    final projectEntries = allEntries.where((e) => e.projectId == project.id).toList();

    double approvedCost = 0;
    double approvedHours = 0;
    double pendingCost = 0;
    double pendingHours = 0;

    // Rozpad po pracovnících
    final Map<String, _WorkerBudgetStat> workerStats = {};

    for (final e in projectEntries) {
      if (e.isApproved) {
        approvedCost += e.totalAmount;
        approvedHours += e.hoursWorked;
        workerStats.putIfAbsent(e.userId, () => _WorkerBudgetStat(name: e.userName));
        workerStats[e.userId]!.approvedCost += e.totalAmount;
        workerStats[e.userId]!.approvedHours += e.hoursWorked;
      } else if (e.isPending) {
        pendingCost += e.totalAmount;
        pendingHours += e.hoursWorked;
      }
    }

    final double budget = project.budgetLimitKcz;
    final double percent = budget > 0 ? (approvedCost / budget) : 0.0;
    final bool isOverBudget = approvedCost > budget && budget > 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    project.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  Text(
                    'Klient: ${project.client}',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: project.isOpen ? Colors.green.shade50 : Colors.grey.shade200,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: project.isOpen ? Colors.green.shade300 : Colors.grey.shade400),
              ),
              child: Text(
                project.isOpen ? 'OTEVŘENÁ' : 'UZAVŘENÁ',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: project.isOpen ? Colors.green.shade900 : Colors.grey.shade800,
                ),
              ),
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 10.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // UKAZATEL ČERPÁNÍ ROZPOČTU
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Čerpání: ${(percent * 100).toStringAsFixed(1)} % (${Formatters.formatKcz(approvedCost)} z ${Formatters.formatKcz(budget)})',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isOverBudget ? Colors.red.shade900 : Colors.grey.shade800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: percent.clamp(0.0, 1.0),
                  minHeight: 8,
                  backgroundColor: Colors.grey.shade200,
                  color: isOverBudget ? Colors.red : (percent > 0.8 ? Colors.amber : Colors.blue),
                ),
              ),
              if (isOverBudget) ...[
                const SizedBox(height: 4),
                Text(
                  'UPOZORNĚNÍ: Rozpočet zakázky byl překročen o ${Formatters.formatKcz(approvedCost - budget)}!',
                  style: const TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ],
          ),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Schválené náklady: ${Formatters.formatKcz(approvedCost)} (${Formatters.formatHours(approvedHours)})'),
                    if (pendingCost > 0)
                      Text(
                        'Čeká: +${Formatters.formatKcz(pendingCost)}',
                        style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Rozpad nákladů dle pracovníků:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 6),
                if (workerStats.isEmpty)
                  const Text('Na této zakázce zatím nejsou žádné schválené hodiny.', style: TextStyle(fontSize: 12, color: Colors.grey))
                else
                  ...workerStats.values.map(
                    (stat) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('• ${stat.name} (${Formatters.formatHours(stat.approvedHours)})', style: const TextStyle(fontSize: 13)),
                          Text(Formatters.formatKcz(stat.approvedCost), style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => widget.firestoreService.toggleProjectStatus(project.id, project.status),
                      icon: Icon(project.isOpen ? Icons.lock_outline : Icons.lock_open),
                      label: Text(project.isOpen ? 'Uzavřít zakázku' : 'Otevřít zakázku'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WorkerBudgetStat {
  final String name;
  double approvedCost = 0;
  double approvedHours = 0;
  _WorkerBudgetStat({required this.name});
}
