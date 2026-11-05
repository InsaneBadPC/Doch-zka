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
  final DateTime _selectedMonth = DateTime.now();

  Future<void> _addUserDialog() async {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    final rateCtrl = TextEditingController(text: '250');
    bool allowCustom = false;
    String role = 'worker';
    final formKey = GlobalKey<FormState>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Nový zaměstnanec', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Jméno a příjmení *'),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Vyplňte jméno' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Přihlašovací e-mail *'),
                    validator: (val) => val == null || !val.contains('@') ? 'Zadejte platný e-mail' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: passCtrl,
                    decoration: const InputDecoration(labelText: 'Přihlašovací heslo *'),
                    validator: (val) => val == null || val.trim().length < 4 ? 'Alespoň 4 znaky' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: rateCtrl,
                    decoration: const InputDecoration(labelText: 'Hodinová sazba (Kč/h) *'),
                    keyboardType: TextInputType.number,
                    validator: (val) => (val == null || double.tryParse(val) == null) ? 'Zadejte platné číslo' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: role,
                    decoration: const InputDecoration(labelText: 'Systémová role'),
                    items: const [
                      DropdownMenuItem(value: 'worker', child: Text('Pracovník (worker)')),
                      DropdownMenuItem(value: 'admin', child: Text('Vedoucí / Správce (admin)')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => role = val);
                    },
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Povolit vlastní sazbu u směny', style: TextStyle(fontSize: 13)),
                    value: allowCustom,
                    activeColor: const Color(0xFFD4F73C),
                    onChanged: (val) => setDialogState(() => allowCustom = val),
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
              child: const Text('Vytvořit účet'),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      try {
        await widget.firestoreService.addUser(
          name: nameCtrl.text.trim(),
          email: emailCtrl.text.trim(),
          role: role,
          defaultHourlyRate: double.parse(rateCtrl.text),
          allowCustomRate: allowCustom,
          password: passCtrl.text.trim(),
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Zaměstnanec ${nameCtrl.text.trim()} byl vytvořen.')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Chyba: $e'), backgroundColor: const Color(0xFFFF5B65)),
          );
        }
      }
    }
  }

  Future<void> _editUserDialog(AppUser user) async {
    final nameCtrl = TextEditingController(text: user.name);
    final emailCtrl = TextEditingController(text: user.email);
    final passCtrl = TextEditingController(text: user.password ?? '');
    final rateCtrl = TextEditingController(text: user.defaultHourlyRate.toStringAsFixed(0));
    bool allowCustom = user.allowCustomRate;
    bool active = user.active;
    String role = user.role;
    final formKey = GlobalKey<FormState>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Upravit: ${user.name}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Jméno a příjmení'),
                    validator: (val) => val == null || val.trim().isEmpty ? 'Vyplňte jméno' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: emailCtrl,
                    decoration: const InputDecoration(labelText: 'Přihlašovací e-mail'),
                    validator: (val) => val == null || !val.contains('@') ? 'Zadejte platný e-mail' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: passCtrl,
                    decoration: const InputDecoration(labelText: 'Přihlašovací heslo'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: rateCtrl,
                    decoration: const InputDecoration(labelText: 'Výchozí hodinová sazba (Kč/h)'),
                    keyboardType: TextInputType.number,
                    validator: (val) => (val == null || double.tryParse(val) == null) ? 'Zadejte platné číslo' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: role,
                    decoration: const InputDecoration(labelText: 'Systémová role'),
                    items: const [
                      DropdownMenuItem(value: 'worker', child: Text('Pracovník (worker)')),
                      DropdownMenuItem(value: 'admin', child: Text('Vedoucí / Správce (admin)')),
                    ],
                    onChanged: (val) {
                      if (val != null) setDialogState(() => role = val);
                    },
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Povolit vlastní sazbu u směny', style: TextStyle(fontSize: 13)),
                    value: allowCustom,
                    activeColor: const Color(0xFFD4F73C),
                    onChanged: (val) => setDialogState(() => allowCustom = val),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Aktivní účet (povolen přístup)', style: TextStyle(fontSize: 13)),
                    subtitle: Text(
                      active ? 'Uživatel se může přihlásit' : 'Přístup je zablokován',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                    ),
                    value: active,
                    activeColor: const Color(0xFFD4F73C),
                    onChanged: (val) => setDialogState(() => active = val),
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
        email: emailCtrl.text.trim(),
        password: passCtrl.text.trim().isNotEmpty ? passCtrl.text.trim() : user.password,
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
                      'Lidé a sazby (${users.length})',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                    FilledButton.icon(
                      onPressed: _addUserDialog,
                      icon: const Icon(Icons.person_add_alt_1, size: 18),
                      label: const Text('+ Zaměstnanec'),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ...users.map((u) {
                  final userMonthEntries = allEntries
                      .where((e) => e.userId == u.id && e.date.startsWith(monthKey) && e.isApproved)
                      .toList();

                  double earned = 0;
                  double hours = 0;
                  for (final e in userMonthEntries) {
                    earned += e.totalAmount;
                    hours += e.hoursWorked;
                  }

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF121513),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: u.isAdmin ? const Color(0xFFF59E0B).withOpacity(0.4) : const Color(0xFF232A23),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: u.isAdmin
                                ? const Color(0xFFF59E0B).withOpacity(0.15)
                                : const Color(0xFFD4F73C).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(
                            u.isAdmin ? Icons.shield : Icons.person,
                            color: u.isAdmin ? const Color(0xFFF59E0B) : const Color(0xFFD4F73C),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      u.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: u.isAdmin
                                          ? const Color(0xFFF59E0B).withOpacity(0.18)
                                          : const Color(0xFF1C251C),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      u.isAdmin ? 'ŠÉF' : 'PRACOVNÍK',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: u.isAdmin ? const Color(0xFFF59E0B) : const Color(0xFFD4F73C),
                                      ),
                                    ),
                                  ),
                                  if (!u.active) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFF5B65).withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Text(
                                        'BLOKOVÁN',
                                        style: TextStyle(color: Color(0xFFFF5B65), fontSize: 10, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${u.email} · Sazba: ${Formatters.formatKcz(u.defaultHourlyRate)}/h',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Tento měsíc schváleno: ${Formatters.formatKcz(earned)} (${Formatters.formatHours(hours)})',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFFD4F73C),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, color: Color(0xFF94A3B8)),
                          tooltip: 'Upravit pracovníka',
                          onPressed: () => _editUserDialog(u),
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
  }
}
