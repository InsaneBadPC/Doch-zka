import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/project_model.dart';
import '../../models/project_photo.dart';
import '../../services/firestore_service.dart';
import '../../utils/formatters.dart';

class ProjectPhotosDialog extends StatefulWidget {
  final ProjectModel project;
  final AppUser currentUser;
  final FirestoreService firestoreService;

  const ProjectPhotosDialog({
    super.key,
    required this.project,
    required this.currentUser,
    required this.firestoreService,
  });

  @override
  State<ProjectPhotosDialog> createState() => _ProjectPhotosDialogState();
}

class _ProjectPhotosDialogState extends State<ProjectPhotosDialog> {
  final _captionController = TextEditingController();
  String _selectedPresetLabel = 'Stav prací na zakázce';

  static const List<Map<String, String>> _photoPresets = [
    {'label': 'Stav prací na zakázce', 'tag': 'STAVBA'},
    {'label': 'Před zahájením montáže', 'tag': 'PŘED'},
    {'label': 'Dokončená etapa / Předání', 'tag': 'HOTOVO'},
    {'label': 'Dodaný materiál / Účtenka', 'tag': 'MATERIÁL'},
    {'label': 'Vícepráce / Závada na místě', 'tag': 'VÍCEPRÁCE'},
  ];

  @override
  void dispose() {
    _captionController.dispose();
    super.dispose();
  }

  Future<void> _addPhotoRecord() async {
    final caption = _captionController.text.trim().isNotEmpty
        ? _captionController.text.trim()
        : _selectedPresetLabel;

    await widget.firestoreService.addProjectPhoto(
      projectId: widget.project.id,
      user: widget.currentUser,
      photoData: 'preset:$_selectedPresetLabel',
      caption: caption,
    );

    _captionController.clear();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Záznam fotodokumentace byl uložen k zakázce.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF121513),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFF232A23)),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: StreamBuilder<List<ProjectPhoto>>(
            stream: widget.firestoreService.streamProjectPhotos(widget.project.id),
            initialData: widget.firestoreService.getProjectPhotosSync(widget.project.id),
            builder: (context, snap) {
              final photos = snap.data ?? [];

              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD4F73C).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.camera_alt_outlined, color: Color(0xFFD4F73C), size: 20),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Fotodokumentace (${photos.length})',
                              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                            ),
                            Text(
                              '${widget.project.name} · ${widget.project.client}',
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close, color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFF232A23), height: 20),

                  // Formulář pro přidání fotodokumentace / štítku
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A0D0B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF232A23)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        DropdownButtonFormField<String>(
                          value: _selectedPresetLabel,
                          dropdownColor: const Color(0xFF121513),
                          decoration: const InputDecoration(
                            labelText: 'Kategorie dokumentace',
                            isDense: true,
                          ),
                          items: _photoPresets.map((p) {
                            return DropdownMenuItem(
                              value: p['label']!,
                              child: Text('${p['tag']} — ${p['label']}', style: const TextStyle(fontSize: 13)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedPresetLabel = val);
                          },
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _captionController,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: const InputDecoration(
                            labelText: 'Popisek fotky / záznamu ze stavby',
                            hintText: 'např. Hotové rozvody 2. NP, převzatý materiál...',
                            isDense: true,
                          ),
                        ),
                        const SizedBox(height: 10),
                        FilledButton.icon(
                          onPressed: _addPhotoRecord,
                          icon: const Icon(Icons.add_a_photo_outlined, size: 16),
                          label: const Text('Přidat záznam fotodokumentace'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Seznam fotodokumentace
                  Expanded(
                    child: photos.isEmpty
                        ? const Center(
                            child: Text(
                              'Zatím nebyla k této zakázce nahrána žádná fotodokumentace.',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                              textAlign: TextAlign.center,
                            ),
                          )
                        : ListView.builder(
                            itemCount: photos.length,
                            itemBuilder: (context, idx) {
                              final p = photos[idx];
                              final canDelete =
                                  widget.currentUser.isAdmin || p.userId == widget.currentUser.id;
                              final datePart = p.createdAt.length >= 10 ? p.createdAt.substring(0, 10) : p.createdAt;

                              return Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0A0D0B),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFF232A23)),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 54,
                                      height: 54,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF1C251C),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: const Color(0xFFD4F73C).withOpacity(0.3)),
                                      ),
                                      child: const Icon(Icons.photo_camera_back_outlined, color: Color(0xFFD4F73C), size: 26),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            p.caption.isNotEmpty ? p.caption : 'Fotodokumentace zakázky',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Nahrál: ${p.userName} · ${Formatters.formatDateCz(datePart)} ${Formatters.formatTimeFromIso(p.createdAt)}',
                                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (canDelete)
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Color(0xFFFF5B65), size: 18),
                                        onPressed: () => widget.firestoreService.deleteProjectPhoto(p.id),
                                      ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
