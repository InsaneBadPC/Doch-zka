import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/app_user.dart';
import '../models/project_model.dart';
import '../models/time_entry.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: 'ai-studio-firemndochzkaaev-cf66a2c8-383c-4be5-bade-042d1600b80c',
  );

  // Kolekce
  CollectionReference<Map<String, dynamic>> get _usersCol =>
      _firestore.collection('users');
  CollectionReference<Map<String, dynamic>> get _projectsCol =>
      _firestore.collection('projects');
  CollectionReference<Map<String, dynamic>> get _timeEntriesCol =>
      _firestore.collection('time_entries');

  // ================= USERS =================

  /// Stream profilu uživatele podle UID
  Stream<AppUser?> streamUser(String uid) {
    return _usersCol.doc(uid).snapshots().map((doc) {
      if (!doc.exists || doc.data() == null) return null;
      return AppUser.fromMap(doc.id, doc.data()!);
    });
  }

  /// Stream všech uživatelů pro admina
  Stream<List<AppUser>> streamAllUsers() {
    return _usersCol.snapshots().map((snap) {
      return snap.docs
          .map((doc) => AppUser.fromMap(doc.id, doc.data()))
          .toList()
        ..sort((a, b) => a.name.compareTo(b.name));
    });
  }

  /// Aktualizace údajů pracovníka adminem
  Future<void> updateUser(AppUser user) async {
    await _usersCol.doc(user.id).update(user.toMap());
  }

  // ================= PROJECTS =================

  /// Stream všech zakázek
  Stream<List<ProjectModel>> streamProjects() {
    return _projectsCol.snapshots().map((snap) {
      return snap.docs
          .map((doc) => ProjectModel.fromMap(doc.id, doc.data()))
          .toList()
        ..sort((a, b) => a.name.compareTo(b.name));
    });
  }

  /// Vytvoření nové zakázky
  Future<void> createProject({
    required String name,
    required String client,
    required double budgetLimitKcz,
  }) async {
    final newDoc = _projectsCol.doc();
    final project = ProjectModel(
      id: newDoc.id,
      name: name.trim(),
      client: client.trim(),
      status: 'open',
      budgetLimitKcz: budgetLimitKcz,
      createdAt: DateTime.now().toIso8601String(),
    );
    await newDoc.set(project.toMap());
  }

  /// Změna stavu zakázky (open / closed)
  Future<void> toggleProjectStatus(String projectId, String currentStatus) async {
    final nextStatus = currentStatus == 'open' ? 'closed' : 'open';
    await _projectsCol.doc(projectId).update({'status': nextStatus});
  }

  // ================= TIME ENTRIES =================

  /// Stream směn pracovníka - filtruje pouze na serveru podle userId (nulová závislost na indexech)
  Stream<List<TimeEntry>> streamWorkerEntries(String uid) {
    return _timeEntriesCol
        .where('userId', isEqualTo: uid)
        .snapshots()
        .map((snap) {
      final entries = snap.docs
          .map((doc) => TimeEntry.fromMap(doc.id, doc.data()))
          .toList();
      // Řazení v paměti na klientovi (nejnovější nahoře)
      entries.sort((a, b) => b.startTime.compareTo(a.startTime));
      return entries;
    });
  }

  /// Stream všech směn pro admina
  Stream<List<TimeEntry>> streamAllEntries() {
    return _timeEntriesCol.snapshots().map((snap) {
      final entries = snap.docs
          .map((doc) => TimeEntry.fromMap(doc.id, doc.data()))
          .toList();
      entries.sort((a, b) => b.startTime.compareTo(a.startTime));
      return entries;
    });
  }

  /// Kontrola časových kolizí se stávajícími směnami pracovníka
  /// Pravidlo překryvu: (newStart < existingEnd && newEnd > existingStart)
  Future<bool> hasCollision({
    required String userId,
    required DateTime newStart,
    required DateTime newEnd,
    String? excludeEntryId,
  }) async {
    final query = await _timeEntriesCol.where('userId', isEqualTo: userId).get();
    for (final doc in query.docs) {
      if (excludeEntryId != null && doc.id == excludeEntryId) continue;
      final data = doc.data();
      final startIso = data['startTime'] as String?;
      final endIso = data['endTime'] as String?;
      if (startIso == null || endIso == null) continue;

      final existingStart = DateTime.tryParse(startIso);
      final existingEnd = DateTime.tryParse(endIso);
      if (existingStart == null || existingEnd == null) continue;

      // Detekce kolize
      if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
        return true;
      }
    }
    return false;
  }

  /// Spuštění živých stopek
  Future<String> startLiveShift({
    required AppUser user,
    required ProjectModel project,
  }) async {
    final now = DateTime.now();
    final newDoc = _timeEntriesCol.doc();
    final entry = TimeEntry(
      id: newDoc.id,
      userId: user.id,
      userName: user.name,
      projectId: project.id,
      projectName: project.name,
      date: now.toIso8601String().substring(0, 10),
      startTime: now.toIso8601String(),
      endTime: null,
      breakMinutes: 0,
      hoursWorked: 0.0,
      hourlyRate: user.defaultHourlyRate,
      isCustomRate: false,
      totalAmount: 0.0,
      note: '',
      status: 'draft',
      isRunning: true,
    );

    await newDoc.set(entry.toMap());
    return newDoc.id;
  }

  /// Ukončení běžící směny
  Future<void> stopLiveShift({
    required TimeEntry runningEntry,
    required DateTime endTime,
    required int breakMinutes,
    required String note,
    required double hourlyRate,
    required bool isCustomRate,
    required bool submitDirectly, // true = pending, false = draft
  }) async {
    final start = DateTime.parse(runningEntry.startTime);
    final totalDurationMinutes = endTime.difference(start).inMinutes;
    final netMinutes = (totalDurationMinutes - breakMinutes).clamp(0, 24 * 60);
    final hoursWorked = double.parse((netMinutes / 60.0).toStringAsFixed(2));
    final totalAmount = double.parse((hoursWorked * hourlyRate).toStringAsFixed(2));

    await _timeEntriesCol.doc(runningEntry.id).update({
      'endTime': endTime.toIso8601String(),
      'breakMinutes': breakMinutes,
      'hoursWorked': hoursWorked,
      'hourlyRate': hourlyRate,
      'isCustomRate': isCustomRate,
      'totalAmount': totalAmount,
      'note': note.trim(),
      'status': submitDirectly ? 'pending' : 'draft',
      'isRunning': false,
    });
  }

  /// Ruční vytvoření směny
  Future<void> createManualShift(TimeEntry entry) async {
    final docRef = _timeEntriesCol.doc();
    final map = entry.toMap();
    await docRef.set(map);
  }

  /// Úprava existující směny (pouze draft nebo rejected)
  Future<void> updateShift(TimeEntry entry) async {
    await _timeEntriesCol.doc(entry.id).update(entry.toMap());
  }

  /// Smazání směny (pouze draft)
  Future<void> deleteShift(String entryId) async {
    await _timeEntriesCol.doc(entryId).delete();
  }

  /// Odeslání konceptu ke schválení (draft -> pending)
  Future<void> submitDraftForApproval(String entryId) async {
    await _timeEntriesCol.doc(entryId).update({'status': 'pending'});
  }

  /// Schválení jedné směny adminem
  Future<void> approveShift({
    required String entryId,
    required String adminUid,
  }) async {
    await _timeEntriesCol.doc(entryId).update({
      'status': 'approved',
      'approvedBy': adminUid,
      'approvedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Vrácení směny k opravě šéfem
  Future<void> rejectShift({
    required String entryId,
    required String reason,
  }) async {
    await _timeEntriesCol.doc(entryId).update({
      'status': 'rejected',
      'adminComment': reason.trim(),
    });
  }

  /// Hromadné schválení všech čekajících směn pomocí WriteBatch
  Future<int> batchApproveAll(List<TimeEntry> pendingEntries, String adminUid) async {
    if (pendingEntries.isEmpty) return 0;
    final batch = _firestore.batch();
    for (final entry in pendingEntries) {
      final docRef = _timeEntriesCol.doc(entry.id);
      batch.update(docRef, {
        'status': 'approved',
        'approvedBy': adminUid,
        'approvedAt': FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    return pendingEntries.length;
  }
}
