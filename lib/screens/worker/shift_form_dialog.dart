import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/project_model.dart';
import '../../models/time_entry.dart';
import '../../services/firestore_service.dart';
import '../../utils/formatters.dart';

class ShiftFormDialog extends StatefulWidget {
  final AppUser user;
  final List<ProjectModel> projects;
  final FirestoreService firestoreService;
  final TimeEntry? existingEntry;

  const ShiftFormDialog({
    super.key,
    required this.user,
    required this.projects,
    required this.firestoreService,
    this.existingEntry,
  });

  @override
  State<ShiftFormDialog> createState() => _ShiftFormDialogState();
}

class _ShiftFormDialogState extends State<ShiftFormDialog> {
  final _formKey = GlobalKey<FormState>();

  late String _selectedProjectId;
  late DateTime _selectedDate;
  late TimeOfDay _startTime;
  late TimeOfDay _endTime;
  late int _breakMinutes;
  late double _hourlyRate;
  late TextEditingController _noteController;

  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final entry = widget.existingEntry;

    // Výběr zakázky (pouze otevřené, pokud nevycházíme z existující)
    final openProjects = widget.projects.where((p) => p.isOpen).toList();
    if (entry != null) {
      _selectedProjectId = entry.projectId;
      _selectedDate = DateTime.tryParse(entry.date) ?? DateTime.now();
      final startDt = DateTime.tryParse(entry.startTime) ?? DateTime.now();
      _startTime = TimeOfDay(hour: startDt.hour, minute: startDt.minute);
      if (entry.endTime != null) {
        final endDt = DateTime.parse(entry.endTime!);
        _endTime = TimeOfDay(hour: endDt.hour, minute: endDt.minute);
      } else {
        _endTime = TimeOfDay(hour: (_startTime.hour + 8) % 24, minute: _startTime.minute);
      }
      _breakMinutes = entry.breakMinutes;
      _hourlyRate = entry.hourlyRate;
      _noteController = TextEditingController(text: entry.note);
    } else {
      _selectedProjectId = openProjects.isNotEmpty ? openProjects.first.id : (widget.projects.isNotEmpty ? widget.projects.first.id : '');
      _selectedDate = DateTime.now();
      _startTime = const TimeOfDay(hour: 7, minute: 0);
      _endTime = const TimeOfDay(hour: 15, minute: 30);
      _breakMinutes = 30;
      _hourlyRate = widget.user.defaultHourlyRate;
      _noteController = TextEditingController();
    }
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  // Výpočet čistých odpracovaných hodin s ohledem na noční směnu
  double get _calculatedHours {
    DateTime start = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );

    DateTime end = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _endTime.hour,
      _endTime.minute,
    );

    // Noční směna: pokud je čas Do menší nebo roven Od, přičteme 1 den
    if (end.isBefore(start) || end.isAtSameMomentAs(start)) {
      end = end.add(const Duration(days: 1));
    }

    final totalMinutes = end.difference(start).inMinutes;
    final netMinutes = (totalMinutes - _breakMinutes).clamp(0, 24 * 60);
    return double.parse((netMinutes / 60.0).toStringAsFixed(2));
  }

  double get _calculatedTotalAmount {
    return double.parse((_calculatedHours * _hourlyRate).toStringAsFixed(2));
  }

  Future<void> _submit({required bool sendForApproval}) async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedProjectId.isEmpty) {
      setState(() => _errorMessage = 'Vyberte platnou otevřenou zakázku.');
      return;
    }

    DateTime start = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );

    DateTime end = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _endTime.hour,
      _endTime.minute,
    );

    // Noční směna
    if (end.isBefore(start) || end.isAtSameMomentAs(start)) {
      end = end.add(const Duration(days: 1));
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      // Detekce časových kolizí (startTime < existingEnd && endTime > existingStart)
      final collision = await widget.firestoreService.hasCollision(
        userId: widget.user.id,
        newStart: start,
        newEnd: end,
        excludeEntryId: widget.existingEntry?.id,
      );

      if (collision) {
        setState(() {
          _errorMessage =
              'Časová kolize! V zadaném rozmezí (${Formatters.formatDateCz(_selectedDate.toIso8601String().substring(0, 10))} ${_startTime.format(context)} - ${_endTime.format(context)}) se již překrývá jiná vaše směna.';
          _isSaving = false;
        });
        return;
      }

      final project = widget.projects.firstWhere(
        (p) => p.id == _selectedProjectId,
        orElse: () => ProjectModel(
          id: _selectedProjectId,
          name: 'Zakázka',
          client: '',
          status: 'open',
          budgetLimitKcz: 0,
          createdAt: '',
        ),
      );

      final isCustom = _hourlyRate != widget.user.defaultHourlyRate;
      final hours = _calculatedHours;
      final total = _calculatedTotalAmount;
      final status = sendForApproval ? 'pending' : 'draft';

      final newEntry = TimeEntry(
        id: widget.existingEntry?.id ?? '',
        userId: widget.user.id,
        userName: widget.user.name,
        projectId: project.id,
        projectName: project.name,
        date: _selectedDate.toIso8601String().substring(0, 10),
        startTime: start.toIso8601String(),
        endTime: end.toIso8601String(),
        breakMinutes: _breakMinutes,
        hoursWorked: hours,
        hourlyRate: _hourlyRate,
        isCustomRate: isCustom,
        totalAmount: total,
        note: _noteController.text.trim(),
        status: status,
        isRunning: false,
        adminComment: '',
      );

      if (widget.existingEntry == null) {
        await widget.firestoreService.createManualShift(newEntry);
      } else {
        await widget.firestoreService.updateShift(newEntry);
      }

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Chyba při ukládání: $e';
        _isSaving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final availableProjects = widget.projects.where((p) => p.isOpen || p.id == _selectedProjectId).toList();

    return AlertDialog(
      title: Text(widget.existingEntry == null ? 'Zapsat novou směnu' : 'Upravit směnu'),
      content: SingleChildScrollView(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(10),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade300),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: Colors.red.shade900, fontSize: 13),
                    ),
                  ),
                ],

                // Výběr zakázky
                DropdownButtonFormField<String>(
                  value: availableProjects.any((p) => p.id == _selectedProjectId) ? _selectedProjectId : null,
                  decoration: const InputDecoration(
                    labelText: 'Zakázka *',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.business_center_outlined),
                  ),
                  items: availableProjects.map((p) {
                    return DropdownMenuItem(
                      value: p.id,
                      child: Text('${p.name} (${p.client})'),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedProjectId = val);
                  },
                  validator: (val) => val == null || val.isEmpty ? 'Vyberte zakázku' : null,
                ),
                const SizedBox(height: 14),

                // Datum směny
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Datum směny:'),
                  subtitle: Text(
                    Formatters.formatDateCz(_selectedDate.toIso8601String().substring(0, 10)),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.calendar_month),
                    onPressed: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime.now().add(const Duration(days: 30)),
                      );
                      if (picked != null) setState(() => _selectedDate = picked);
                    },
                  ),
                ),
                const Divider(),

                // Časy Od - Do
                Row(
                  children: [
                    Expanded(
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Od (začátek):'),
                        subtitle: Text(
                          _startTime.format(context),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        onTap: () async {
                          final picked = await showTimePicker(
                            context: context,
                            initialTime: _startTime,
                          );
                          if (picked != null) setState(() => _startTime = picked);
                        },
                      ),
                    ),
                    Expanded(
                      child: ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Do (konec):'),
                        subtitle: Text(
                          _endTime.format(context),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        onTap: () async {
                          final picked = await showTimePicker(
                            context: context,
                            initialTime: _endTime,
                          );
                          if (picked != null) setState(() => _endTime = picked);
                        },
                      ),
                    ),
                  ],
                ),

                // Noční směna hint
                if ((_endTime.hour < _startTime.hour) ||
                    (_endTime.hour == _startTime.hour && _endTime.minute <= _startTime.minute)) ...[
                  Container(
                    padding: const EdgeInsets.all(8),
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.amber.shade300),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.nightlight_round, size: 16, color: Colors.orange),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Noční směna: konec směny je automaticky započítán následující den (+1 den).',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Pauza (minuty)
                DropdownButtonFormField<int>(
                  value: _breakMinutes,
                  decoration: const InputDecoration(
                    labelText: 'Pauza na jídlo / odpočinek',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.free_breakfast_outlined),
                  ),
                  items: const [
                    DropdownMenuItem(value: 0, child: Text('0 minut (bez pauzy)')),
                    DropdownMenuItem(value: 15, child: Text('15 minut')),
                    DropdownMenuItem(value: 30, child: Text('30 minut')),
                    DropdownMenuItem(value: 45, child: Text('45 minut')),
                    DropdownMenuItem(value: 60, child: Text('60 minut (1 hodina)')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _breakMinutes = val);
                  },
                ),
                const SizedBox(height: 14),

                // Hodinová sazba (pouze pokud allowCustomRate)
                if (widget.user.allowCustomRate) ...[
                  TextFormField(
                    initialValue: _hourlyRate.toStringAsFixed(0),
                    decoration: const InputDecoration(
                      labelText: 'Vlastní hodinová sazba (Kč/h)',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.attach_money),
                      helperText: 'Máte povoleno upravit hodinovou sazbu směny',
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (val) {
                      final parsed = double.tryParse(val);
                      if (parsed != null && parsed > 0) {
                        setState(() => _hourlyRate = parsed);
                      }
                    },
                  ),
                  const SizedBox(height: 14),
                ],

                // Poznámka
                TextFormField(
                  controller: _noteController,
                  decoration: const InputDecoration(
                    labelText: 'Popis vykonané práce (poznámka)',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.notes),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),

                // Přehled hodin a částky
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blueGrey.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Čistý čas:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          Text(
                            Formatters.formatHours(_calculatedHours),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Vychází výdělek:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          Text(
                            Formatters.formatKcz(_calculatedTotalAmount),
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Colors.green.shade800,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSaving ? null : () => Navigator.of(context).pop(),
          child: const Text('Zrušit'),
        ),
        OutlinedButton(
          onPressed: _isSaving ? null : () => _submit(sendForApproval: false),
          child: const Text('Uložit koncept'),
        ),
        FilledButton.icon(
          onPressed: _isSaving ? null : () => _submit(sendForApproval: true),
          icon: const Icon(Icons.send, size: 16),
          label: const Text('Odeslat ke schválení'),
        ),
      ],
    );
  }
}
