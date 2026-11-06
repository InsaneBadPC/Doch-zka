import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/salary_advance.dart';
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

  void _showEmployeeDetailDialog(AppUser user, List<TimeEntry> allEntries) {
    DateTime detailMonth = _selectedMonth;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final mKey = Formatters.toMonthKey(detailMonth);
          final empEntries = allEntries
              .where((e) => e.userId == user.id && e.date.startsWith(mKey) && !e.isRunning)
              .toList();

          double approvedHours = 0;
          double approvedCost = 0;
          final Map<String, double> projectHours = {};
          final Map<String, double> projectCost = {};

          for (final e in empEntries) {
            if (e.isApproved) {
              approvedHours += e.hoursWorked;
              approvedCost += e.totalAmount;
              projectHours[e.projectName] = (projectHours[e.projectName] ?? 0) + e.hoursWorked;
              projectCost[e.projectName] = (projectCost[e.projectName] ?? 0) + e.totalAmount;
            }
          }

          return StreamBuilder<List<SalaryAdvance>>(
            stream: widget.firestoreService.streamAdvances(userId: user.id),
            initialData: widget.firestoreService.getAdvancesSync(userId: user.id),
            builder: (context, advSnap) {
              final allAdv = advSnap.data ?? [];
              final monthAdv = allAdv.where((a) => a.monthKey == mKey).toList();
              final advTotal = monthAdv.fold<double>(0, (sum, a) => sum + a.amount);
              final netPayable = approvedCost - advTotal;

              return Dialog(
                backgroundColor: const Color(0xFF121513),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                  side: const BorderSide(color: Color(0xFF232A23)),
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480, maxHeight: 620),
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    user.name,
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17),
                                  ),
                                  Text(
                                    '${user.email} · ${Formatters.formatKcz(user.defaultHourlyRate)}/h',
                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                              onPressed: () => Navigator.of(ctx).pop(),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        // Přepínač měsíce
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.chevron_left, color: Colors.white),
                              onPressed: () => setModalState(() {
                                detailMonth = DateTime(detailMonth.year, detailMonth.month - 1, 1);
                              }),
                            ),
                            Text(
                              Formatters.formatMonthDisplay(detailMonth),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            IconButton(
                              icon: const Icon(Icons.chevron_right, color: Colors.white),
                              onPressed: () => setModalState(() {
                                detailMonth = DateTime(detailMonth.year, detailMonth.month + 1, 1);
                              }),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        // Finanční souhrn
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF090B0A),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFF232A23)),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Schváleno celkem:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                                  Text(
                                    '${Formatters.formatKcz(approvedCost)} (${Formatters.formatHours(approvedHours)})',
                                    style: const TextStyle(color: Color(0xFFD4F73C), fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Vyplacené zálohy:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                                  Text(
                                    '-${Formatters.formatKcz(advTotal)}',
                                    style: const TextStyle(color: Color(0xFFFF5B65), fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ],
                              ),
                              const Divider(color: Color(0xFF232A23), height: 14),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Čistý doplatek:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                  Text(
                                    Formatters.formatKcz(netPayable),
                                    style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w900, fontSize: 15),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        FilledButton.icon(
                          onPressed: () => _addAdvanceDialog(user, mKey),
                          icon: const Icon(Icons.payments_outlined, size: 16),
                          label: const Text('Zapsat vyplacenou zálohu'),
                        ),
                        const SizedBox(height: 10),
                        Expanded(
                          child: ListView(
                            children: [
                              if (monthAdv.isNotEmpty) ...[
                                const Text(
                                  'Vyplacené zálohy:',
                                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                ...monthAdv.map(
                                  (adv) => Container(
                                    margin: const EdgeInsets.only(bottom: 6),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF090B0A),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFF232A23)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '${Formatters.formatDateCz(adv.date)} · ${adv.note.isNotEmpty ? adv.note : "Záloha"}',
                                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                                          ),
                                        ),
                                        Text(
                                          '-${Formatters.formatKcz(adv.amount)}',
                                          style: const TextStyle(color: Color(0xFFFF5B65), fontWeight: FontWeight.bold, fontSize: 12),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, color: Color(0xFFFF5B65), size: 16),
                                          onPressed: () => widget.firestoreService.deleteAdvance(adv.id),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                              ],
                              if (projectHours.isNotEmpty) ...[
                                const Text(
                                  'Rozpad podle zakázek:',
                                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                ...projectHours.entries.map(
                                  (pe) => Padding(
                                    padding: const EdgeInsets.only(bottom: 4),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(pe.key, style: const TextStyle(color: Colors.white, fontSize: 12)),
                                        Text(
                                          '${Formatters.formatHours(pe.value)} · ${Formatters.formatKcz(projectCost[pe.key] ?? 0)}',
                                          style: const TextStyle(color: Color(0xFFD4F73C), fontSize: 12, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 10),
                              ],
                              Text(
                                'Směny v měsíci (${empEntries.length}):',
                                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 6),
                              ...empEntries.map(
                                (e) => Container(
                                  margin: const EdgeInsets.only(bottom: 6),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF090B0A),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: const Color(0xFF232A23)),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${Formatters.formatDateCz(e.date)} · ${e.projectName}',
                                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                            Text(
                                              '${Formatters.formatHours(e.hoursWorked)} (${e.status})',
                                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        Formatters.formatKcz(e.totalAmount),
                                        style: const TextStyle(color: Color(0xFFD4F73C), fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _addAdvanceDialog(AppUser user, String monthKey) async {
    final amountCtrl = TextEditingController(text: '2000');
    final noteCtrl = TextEditingController(text: 'Záloha na mzdu');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF121513),
        title: Text(
          'Zapsat zálohu (${user.name})',
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
              decoration: const InputDecoration(labelText: 'Poznámka (např. hotově / převodem)'),
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
          userId: user.id,
          userName: user.name,
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

    return StreamBuilder<List<AppUser>>(
      stream: widget.firestoreService.streamAllUsers(),
      initialData: widget.firestoreService.getUsersSync(),
      builder: (context, usersSnap) {
        final users = usersSnap.data ?? [];

        return StreamBuilder<List<TimeEntry>>(
          stream: widget.firestoreService.streamAllEntries(),
          initialData: widget.firestoreService.getAllEntriesSync(),
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

                  return InkWell(
                    onTap: () => _showEmployeeDetailDialog(u, allEntries),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
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
                                  'Schváleno: ${Formatters.formatKcz(earned)} (${Formatters.formatHours(hours)}) · Klikněte pro detail & zálohy',
                                  style: const TextStyle(
                                    fontSize: 11,
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
