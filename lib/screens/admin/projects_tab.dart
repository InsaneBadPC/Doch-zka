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
    final budgetCtrl = TextEditingController(text: '80000');
    final formKey = GlobalKey<FormState>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nová zakázka', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Název zakázky *'),
                validator: (val) => val == null || val.trim().isEmpty ? 'Zadejte název' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: clientCtrl,
                decoration: const InputDecoration(labelText: 'Zákazník / Firma *'),
                validator: (val) => val == null || val.trim().isEmpty ? 'Zadejte zákazníka' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: budgetCtrl,
                decoration: const InputDecoration(labelText: 'Mzdový rozpočet (Kč) *'),
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
                      'Zakázky (${projects.length})',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                    FilledButton.icon(
                      onPressed: _createProjectDialog,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Nová zakázka'),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (projects.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text('Zatím nejsou vytvořeny žádné zakázky.', style: TextStyle(color: Color(0xFF94A3B8))),
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

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isOverBudget ? const Color(0xFFFF5B65).withOpacity(0.5) : const Color(0xFF232A23),
        ),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          iconColor: const Color(0xFFD4F73C),
          collapsedIconColor: const Color(0xFF94A3B8),
          title: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      project.name,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Klient: ${project.client}',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: project.isOpen ? const Color(0xFF1C251C) : const Color(0xFF1F2421),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: project.isOpen ? const Color(0xFFD4F73C).withOpacity(0.4) : const Color(0xFF334155),
                  ),
                ),
                child: Text(
                  project.isOpen ? 'OTEVŘENÁ' : 'UZAVŘENÁ',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: project.isOpen ? const Color(0xFFD4F73C) : const Color(0xFF94A3B8),
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
                Text(
                  'Čerpání: ${(percent * 100).toStringAsFixed(1)} % (${Formatters.formatKcz(approvedCost)} z ${Formatters.formatKcz(budget)})',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isOverBudget ? const Color(0xFFFF5B65) : const Color(0xFFCBD5E1),
                  ),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: percent.clamp(0.0, 1.0),
                    minHeight: 7,
                    backgroundColor: const Color(0xFF0A0D0B),
                    color: isOverBudget
                        ? const Color(0xFFFF5B65)
                        : (percent > 0.8 ? const Color(0xFFF59E0B) : const Color(0xFFD4F73C)),
                  ),
                ),
              ],
            ),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Divider(color: Color(0xFF232A23)),
                  const SizedBox(height: 4),
                  Text(
                    'Schválené náklady: ${Formatters.formatKcz(approvedCost)} (${Formatters.formatHours(approvedHours)})',
                    style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Čeká na schválení: ${Formatters.formatKcz(pendingCost)} (${Formatters.formatHours(pendingHours)})',
                    style: const TextStyle(fontSize: 12, color: Color(0xFFF59E0B)),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFF232A23)),
                        ),
                        onPressed: () => widget.firestoreService.toggleProjectStatus(project.id, project.status),
                        icon: Icon(project.isOpen ? Icons.lock_outline : Icons.lock_open, size: 16),
                        label: Text(project.isOpen ? 'Uzavřít zakázku' : 'Znovu otevřít'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkerBudgetStat {
  final String name;
  double approvedHours = 0;
  double approvedCost = 0;
  _WorkerBudgetStat({required this.name});
}
