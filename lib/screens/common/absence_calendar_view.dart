import 'package:flutter/material.dart';
import '../../models/absence_model.dart';
import '../../models/app_user.dart';
import '../../services/firestore_service.dart';
import '../../utils/formatters.dart';

class AbsenceCalendarView extends StatefulWidget {
  final AppUser currentUser;
  final FirestoreService firestoreService;
  final bool isAdminView;

  const AbsenceCalendarView({
    super.key,
    required this.currentUser,
    required this.firestoreService,
    this.isAdminView = false,
  });

  @override
  State<AbsenceCalendarView> createState() => _AbsenceCalendarViewState();
}

class _AbsenceCalendarViewState extends State<AbsenceCalendarView> {
  DateTime _selectedMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);

  void _changeMonth(int delta) {
    setState(() {
      _selectedMonth = DateTime(_selectedMonth.year, _selectedMonth.month + delta, 1);
    });
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'vacation':
        return const Color(0xFFD4F73C);
      case 'doctor':
        return const Color(0xFF38BDF8);
      case 'sick':
        return const Color(0xFFFF5B65);
      case 'personal':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF94A3B8);
    }
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'vacation':
        return Icons.beach_access_outlined;
      case 'doctor':
        return Icons.medical_services_outlined;
      case 'sick':
        return Icons.sick_outlined;
      case 'personal':
        return Icons.event_busy_outlined;
      default:
        return Icons.calendar_today_outlined;
    }
  }

  Future<void> _openCreateAbsenceDialog() async {
    String selectedType = 'vacation';
    DateTime startDate = DateTime.now();
    DateTime endDate = DateTime.now();
    bool isFullDay = true;
    TimeOfDay startTime = const TimeOfDay(hour: 8, minute: 0);
    TimeOfDay endTime = const TimeOfDay(hour: 12, minute: 0);
    final noteCtrl = TextEditingController();

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF121513),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: const BorderSide(color: Color(0xFF232A23)),
              ),
              title: const Text(
                'Nová žádost o volno / nepřítomnost',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<String>(
                      value: selectedType,
                      dropdownColor: const Color(0xFF121513),
                      decoration: const InputDecoration(
                        labelText: 'Typ nepřítomnosti *',
                        prefixIcon: Icon(Icons.category_outlined, color: Color(0xFFD4F73C)),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'vacation', child: Text('Dovolená')),
                        DropdownMenuItem(value: 'doctor', child: Text('Lékař / Propustka')),
                        DropdownMenuItem(value: 'sick', child: Text('Nemocenská (PN)')),
                        DropdownMenuItem(value: 'personal', child: Text('Osobní / Neplacené volno')),
                      ],
                      onChanged: (val) {
                        if (val != null) setDialogState(() => selectedType = val);
                      },
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('Od data:', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                            subtitle: Text(
                              Formatters.formatDateCz(startDate.toIso8601String().substring(0, 10)),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: ctx,
                                initialDate: startDate,
                                firstDate: DateTime(2024),
                                lastDate: DateTime(2030),
                              );
                              if (picked != null) {
                                setDialogState(() {
                                  startDate = picked;
                                  if (endDate.isBefore(startDate)) endDate = startDate;
                                });
                              }
                            },
                          ),
                        ),
                        Expanded(
                          child: ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('Do data:', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                            subtitle: Text(
                              Formatters.formatDateCz(endDate.toIso8601String().substring(0, 10)),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: ctx,
                                initialDate: endDate,
                                firstDate: startDate,
                                lastDate: DateTime(2030),
                              );
                              if (picked != null) {
                                setDialogState(() => endDate = picked);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      activeColor: const Color(0xFFD4F73C),
                      title: const Text('Celodenní nepřítomnost', style: TextStyle(color: Colors.white, fontSize: 13)),
                      value: isFullDay,
                      onChanged: (val) => setDialogState(() => isFullDay = val),
                    ),
                    if (!isFullDay)
                      Row(
                        children: [
                          Expanded(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Čas Od:', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                              subtitle: Text(startTime.format(ctx), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              onTap: () async {
                                final t = await showTimePicker(context: ctx, initialTime: startTime);
                                if (t != null) setDialogState(() => startTime = t);
                              },
                            ),
                          ),
                          Expanded(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: const Text('Čas Do:', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                              subtitle: Text(endTime.format(ctx), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              onTap: () async {
                                final t = await showTimePicker(context: ctx, initialTime: endTime);
                                if (t != null) setDialogState(() => endTime = t);
                              },
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: noteCtrl,
                      maxLines: 2,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: const InputDecoration(
                        labelText: 'Důvod / Poznámka',
                        hintText: 'např. Preventivní prohlídka, rodinná dovolená...',
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(false),
                  child: const Text('Zrušit'),
                ),
                FilledButton.icon(
                  onPressed: () => Navigator.of(ctx).pop(true),
                  icon: const Icon(Icons.send, size: 15),
                  label: Text(widget.currentUser.isAdmin ? 'Zapsat volno' : 'Odeslat žádost'),
                ),
              ],
            );
          },
        );
      },
    );

    if (created == true) {
      final startStr = startDate.toIso8601String().substring(0, 10);
      final endStr = endDate.toIso8601String().substring(0, 10);
      final st = '${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}';
      final et = '${endTime.hour.toString().padLeft(2, '0')}:${endTime.minute.toString().padLeft(2, '0')}';

      await widget.firestoreService.createAbsence(
        user: widget.currentUser,
        type: selectedType,
        startDate: startStr,
        endDate: endStr,
        isFullDay: isFullDay,
        startTime: isFullDay ? null : st,
        endTime: isFullDay ? null : et,
        note: noteCtrl.text,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Žádost o volno byla uložena.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filterUserId = widget.isAdminView ? null : widget.currentUser.id;
    final monthKey = Formatters.toMonthKey(_selectedMonth);

    return StreamBuilder<List<AbsenceModel>>(
      stream: widget.firestoreService.streamAbsences(filterUserId),
      initialData: widget.firestoreService.getAbsencesSync(filterUserId),
      builder: (context, snap) {
        final allAbsences = snap.data ?? [];
        final monthAbsences = allAbsences.where((a) {
          return a.startDate.startsWith(monthKey) || a.endDate.startsWith(monthKey);
        }).toList();
        final pendingAbsences = allAbsences.where((a) => a.isPending).toList();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Hlavička a tlačítko nové žádosti
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFF121513),
                borderRadius: BorderRadius.circular(22),
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
                          widget.isAdminView
                              ? 'Kalendář absencí & Schvalování volna'
                              : 'Kalendář & Žádost o dovolenou / lékaře',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          widget.isAdminView
                              ? 'Čekající žádosti ke schválení: ${pendingAbsences.length}'
                              : 'Přehled vašich plánovaných nepřítomností',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: _openCreateAbsenceDialog,
                    icon: const Icon(Icons.add, size: 17),
                    label: const Text('+ Žádost o volno'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Přepínač měsíce + vizuální mřížka kalendáře
            _buildMonthCalendarGrid(monthAbsences),
            const SizedBox(height: 18),

            // Pro šéfa: Čekající žádosti o volno nahoře
            if (widget.isAdminView && pendingAbsences.isNotEmpty) ...[
              Text(
                'Žádosti o volno ke schválení (${pendingAbsences.length})',
                style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.w900, fontSize: 15),
              ),
              const SizedBox(height: 10),
              ...pendingAbsences.map((a) => _buildAbsenceCard(a)),
              const SizedBox(height: 16),
            ],

            Text(
              'Záznamy v měsíci (${monthAbsences.length})',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15),
            ),
            const SizedBox(height: 10),

            if (monthAbsences.isEmpty)
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: const Color(0xFF121513),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF232A23)),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'V tomto měsíci nejsou evidovány žádné dovolené ani lékaři.',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              )
            else
              ...monthAbsences.map((a) => _buildAbsenceCard(a)),
          ],
        );
      },
    );
  }

  Widget _buildMonthCalendarGrid(List<AbsenceModel> monthAbsences) {
    final year = _selectedMonth.year;
    final month = _selectedMonth.month;
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final firstWeekday = DateTime(year, month, 1).weekday; // 1 = Po .. 7 = Ne

    final List<Widget> cells = [];
    for (int i = 1; i < firstWeekday; i++) {
      cells.add(const SizedBox.shrink());
    }

    for (int day = 1; day <= daysInMonth; day++) {
      final dateIso = '$year-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
      final dayAbsences = monthAbsences.where((a) {
        return dateIso.compareTo(a.startDate) >= 0 && dateIso.compareTo(a.endDate) <= 0;
      }).toList();

      final hasAbsence = dayAbsences.isNotEmpty;
      final primaryColor = hasAbsence ? _typeColor(dayAbsences.first.type) : Colors.transparent;

      cells.add(
        Container(
          margin: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: hasAbsence ? primaryColor.withOpacity(0.18) : const Color(0xFF0A0D0B),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: hasAbsence ? primaryColor.withOpacity(0.6) : const Color(0xFF1E251E),
            ),
          ),
          alignment: Alignment.center,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$day',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: hasAbsence ? FontWeight.w900 : FontWeight.w600,
                  color: hasAbsence ? primaryColor : Colors.white,
                ),
              ),
              if (hasAbsence)
                Container(
                  width: 5,
                  height: 5,
                  margin: const EdgeInsets.only(top: 2),
                  decoration: BoxDecoration(color: primaryColor, shape: BoxShape.circle),
                ),
            ],
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left, color: Colors.white),
                onPressed: () => _changeMonth(-1),
              ),
              Text(
                Formatters.formatMonthDisplay(_selectedMonth),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right, color: Colors.white),
                onPressed: () => _changeMonth(1),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Text('Po', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
              Text('Út', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
              Text('St', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
              Text('Čt', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
              Text('Pá', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
              Text('So', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
              Text('Ne', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 7,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.15,
            children: cells,
          ),
        ],
      ),
    );
  }

  Widget _buildAbsenceCard(AbsenceModel a) {
    final c = _typeColor(a.type);
    Color statusColor;
    String statusLabel;
    if (a.isApproved) {
      statusColor = const Color(0xFFD4F73C);
      statusLabel = 'Schváleno';
    } else if (a.isRejected) {
      statusColor = const Color(0xFFFF5B65);
      statusLabel = 'Zamítnuto';
    } else {
      statusColor = const Color(0xFFF59E0B);
      statusLabel = 'Čeká na schválení';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: c.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_typeIcon(a.type), color: c, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${a.userName} · ${a.typeLabelCz}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                    Text(
                      a.startDate == a.endDate
                          ? '${Formatters.formatDateCz(a.startDate)} (${a.isFullDay ? "Celý den" : "${a.startTime ?? ""} – ${a.endTime ?? ""}"})'
                          : '${Formatters.formatDateCz(a.startDate)} – ${Formatters.formatDateCz(a.endDate)}',
                      style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          if (a.note.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Poznámka: ${a.note}',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (widget.isAdminView && a.isPending) ...[
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFFF5B65),
                    side: const BorderSide(color: Color(0xFFFF5B65)),
                  ),
                  onPressed: () => widget.firestoreService.updateAbsenceStatus(
                    absenceId: a.id,
                    status: 'rejected',
                    adminUid: widget.currentUser.id,
                  ),
                  icon: const Icon(Icons.close, size: 15),
                  label: const Text('Zamítnout', style: TextStyle(fontSize: 12)),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: () => widget.firestoreService.updateAbsenceStatus(
                    absenceId: a.id,
                    status: 'approved',
                    adminUid: widget.currentUser.id,
                  ),
                  icon: const Icon(Icons.check, size: 15),
                  label: const Text('Schválit volno', style: TextStyle(fontSize: 12)),
                ),
              ] else if (a.userId == widget.currentUser.id || widget.isAdminView)
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Color(0xFFFF5B65), size: 18),
                  tooltip: 'Smazat záznam',
                  onPressed: () => widget.firestoreService.deleteAbsence(a.id),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
