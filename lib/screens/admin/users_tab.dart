import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/time_entry.dart';
import '../../services/firestore_service.dart';
import '../../utils/formatters.dart';

class UsersTab extends StatefulWidget {
  final FirestoreService firestoreService;

  const UsersTab({
    super.key,
    required this.firestoreService,
  });

  @override
  State<UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<UsersTab> {
  DateTime _selectedMonth = DateTime.now();

  void _editUserDialog(AppUser user) async {
    final nameCtrl = TextEditingController(text: user.name);
    final rateCtrl = TextEditingController(text: user.defaultHourlyRate.toStringAsFixed(0));
    bool allowCustom = user.allowCustomRate;
    bool active = user.active;
    String role = user.role;
    final formKey = GlobalKey<FormState>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Upravit: ${user.name}'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Jméno a příjmení', border: OutlineInputBorder()),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Vyplňte jméno' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: rateCtrl,
                    decoration: const InputDecoration(labelText: 'Výchozí hodinová sazba (Kč/h)', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (val) => (val == null || double.tryParse(val) == null) ? 'Zadejte platné číslo' : null,
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    title: const Text('Povolit vlastní sazbu u směny'),
                    subtitle: const Text('Pracovník si může při zápisu přepsat hodinovou sazbu'),
                    value: allowCustom,
                    onChanged: (val) => setDialogState(() => allowCustom = val),
                  ),
                  SwitchListTile(
                    title: const Text('Aktivní účet (povolen přístup)'),
                    subtitle: Text(active ? 'Uživatel se může přihlásit' : 'Přístup je zablokován'),
                    value: active,
                    activeColor: Colors.green,
                    onChanged: (val) => setDialogState(() => active = val),
                  ),
                  const Divider(),
                  DropdownButtonFormField<String>(
                    value: role,
                    decoration: const InputDecoration(labelText: 'Systémová role', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'worker', child: Text('Pracovník (worker)')),
                      DropdownMenuItem(value: 'admin', child: Text('Vedoucí / Administrátor (admin)')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => role = val);
                    },
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Zrušit')),
            FilledButton(
              onPressed: () {
                if (formKey.currentState!.validate()) Navigator.of(ctx).pop(true);
              },
              child: const Text('Uložit změny'),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      final updated = user.copyWith(
        name: nameCtrl.text.trim(),
        defaultHourlyRate: double.parse(rateCtrl.text),
        allowCustomRate: allowCustom,
        active: active,
        role: role,
      );
      await widget.firestoreService.updateUser(updated);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Uživatel byl úspěšně upraven.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final monthKey = Formatters.toMonthKey(_selectedMonth);

    return StreamBuilder<List<AppUser>>(
      stream: widget.firestoreService.streamAllUsers(),
      builder: (context, usersSnap) {
        if (usersSnap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final users = usersSnap.data ?? [];

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
                      'Správa lidí a sazeb (${users.length})',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ...users.map((u) {
                  // Výpočet schváleného výdělku za vybraný měsíc
                  final userMonthEntries = allEntries
                      .where((e) => e.userId == u.id && e.date.startsWith(monthKey) && e.isApproved)
                      .toList();

                  double earned = 0;
                  double hours = 0;
                  for (final e in userMonthEntries) {
                    earned += e.totalAmount;
                    hours += e.hoursWorked;
                  }

                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: u.isAdmin ? Colors.indigo.shade100 : Colors.teal.shade100,
                        child: Icon(
                          u.isAdmin ? Icons.admin_panel_settings : Icons.person,
                          color: u.isAdmin ? Colors.indigo : Colors.teal,
                        ),
                      ),
                      title: Row(
                        children: [
                          Expanded(
                            child: Text(
                              u.name,
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                          if (!u.active)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.red.shade100,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text('BLOKOVÁN', style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                        ],
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('E-mail: ${u.email} | Role: ${u.role}'),
                          Text('Sazba: ${Formatters.formatKcz(u.defaultHourlyRate)}/h ${u.allowCustomRate ? " (vlastní sazba povolena)" : ""}'),
                          Text(
                            'Výdělek tento měsíc: ${Formatters.formatKcz(earned)} (${Formatters.formatHours(hours)})',
                            style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.edit_outlined),
                        tooltip: 'Upravit pracovníka',
                        onPressed: () => _editUserDialog(u),
                      ),
                    ),
                  );
                }),
              ],
            );
          },
        );
      },
    );
  }
}
