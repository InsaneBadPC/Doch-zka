import 'package:flutter/material.dart';
import '../../models/project_model.dart';
import '../../services/firestore_service.dart';

Future<ProjectModel?> showCreateProjectDialog({
  required BuildContext context,
  required FirestoreService firestoreService,
  bool isWorker = false,
}) async {
  final nameCtrl = TextEditingController();
  final clientCtrl = TextEditingController();
  final budgetCtrl = TextEditingController(text: '80000');
  final formKey = GlobalKey<FormState>();

  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: const Color(0xFF121513),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFF232A23)),
      ),
      title: const Row(
        children: [
          Icon(Icons.business_center_outlined, color: Color(0xFFD4F73C), size: 22),
          SizedBox(width: 10),
          Text(
            'Nová zakázka',
            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 18),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: nameCtrl,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Název zakázky *',
                  hintText: 'např. Výstavba haly B, Rekonstrukce...',
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Zadejte název zakázky' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: clientCtrl,
                decoration: InputDecoration(
                  labelText: isWorker ? 'Zákazník / Místo zakázky' : 'Zákazník / Firma *',
                  hintText: isWorker ? 'např. Jan Novák / Brno (nepovinné)' : 'Zadejte zákazníka',
                ),
                validator: (val) {
                  if (!isWorker && (val == null || val.trim().isEmpty)) {
                    return 'Zadejte zákazníka';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: budgetCtrl,
                decoration: const InputDecoration(
                  labelText: 'Předpokládaný mzdový rozpočet (Kč)',
                  hintText: '80000',
                ),
                keyboardType: TextInputType.number,
                validator: (val) {
                  if (val != null && val.trim().isNotEmpty && double.tryParse(val) == null) {
                    return 'Zadejte platné číslo';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: const Text('Zrušit'),
        ),
        FilledButton.icon(
          onPressed: () {
            if (formKey.currentState!.validate()) {
              Navigator.of(ctx).pop(true);
            }
          },
          icon: const Icon(Icons.add, size: 16),
          label: const Text('Vytvořit zakázku'),
        ),
      ],
    ),
  );

  if (confirmed == true) {
    final clientText = clientCtrl.text.trim();
    final budgetVal = double.tryParse(budgetCtrl.text.trim()) ?? 80000.0;
    final project = await firestoreService.createProject(
      name: nameCtrl.text.trim(),
      client: clientText.isNotEmpty ? clientText : (isWorker ? 'Klient / Provoz' : 'Firemní zakázka'),
      budgetLimitKcz: budgetVal > 0 ? budgetVal : 80000.0,
    );
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Zakázka "${project.name}" byla úspěšně vytvořena.'),
          backgroundColor: const Color(0xFF172017),
        ),
      );
    }
    return project;
  }
  return null;
}
