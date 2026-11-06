import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/app_user.dart';
import '../models/project_model.dart';
import '../models/time_entry.dart';

class FirestoreService {
  static final FirestoreService _instance = FirestoreService._internal();
  factory FirestoreService() => _instance;

  late final FirebaseFirestore _firestore;
  final StreamController<void> _changeController = StreamController<void>.broadcast();

  final List<AppUser> _users = [];
  final List<ProjectModel> _projects = [];
  final List<TimeEntry> _entries = [];
  bool _initialized = false;

  FirestoreService._internal() {
    _initStore();
  }

  static final List<AppUser> _defaultUsers = [
    AppUser(
      id: 'user-boss-marek-dubina',
      name: 'Marek Dubina',
      email: 'marek.dubina@dochazka.cz',
      role: 'admin',
      defaultHourlyRate: 350.0,
      allowCustomRate: true,
      active: true,
      password: 'MarekDubina4786',
    ),
    AppUser(
      id: 'user-worker-petr-lukes',
      name: 'Petr Lukeš',
      email: 'insanebad2@gmail.com',
      role: 'worker',
      defaultHourlyRate: 200.0,
      allowCustomRate: false,
      active: true,
      password: 'Heslo0897@',
    ),
  ];

  static final List<ProjectModel> _defaultProjects = [
    ProjectModel(
      id: 'proj-default-main',
      name: 'Hlavní provoz / Zakázka',
      client: 'Firemní zakázky',
      status: 'open',
      budgetLimitKcz: 150000.0,
      createdAt: DateTime.now().toIso8601String(),
    ),
  ];

  File? _getStorageFile() {
    if (kIsWeb) return null;
    try {
      final candidates = [
        '/data/user/0/cz.dochazka.dochazka_app/files/dochazka_store_v3.json',
        '/data/data/cz.dochazka.dochazka_app/files/dochazka_store_v3.json',
        '${Directory.systemTemp.path}/dochazka_store_v3.json',
      ];
      for (final path in candidates) {
        try {
          final file = File(path);
          final parent = file.parent;
          if (parent.existsSync()) {
            return file;
          }
        } catch (_) {}
      }
      return File('${Directory.systemTemp.path}/dochazka_store_v3.json');
    } catch (_) {
      return null;
    }
  }

  void _initStore() {
    if (_initialized) return;
    _initialized = true;

    _users.addAll(_defaultUsers);
    _projects.addAll(_defaultProjects);

    // Načtení lokálně uložených dat z disku
    try {
      final file = _getStorageFile();
      if (file != null && file.existsSync()) {
        final raw = file.readAsStringSync();
        final data = jsonDecode(raw) as Map<String, dynamic>;

        if (data['users'] is List) {
          final loadedUsers = (data['users'] as List)
              .map((item) {
                final m = Map<String, dynamic>.from(item as Map);
                return AppUser.fromMap(m['id'] as String? ?? 'usr-${DateTime.now().millisecondsSinceEpoch}', m);
              })
              .toList();
          if (loadedUsers.isNotEmpty) {
            _users
              ..clear()
              ..addAll(loadedUsers);
          }
        }

        if (data['projects'] is List) {
          final loadedProjects = (data['projects'] as List)
              .map((item) {
                final m = Map<String, dynamic>.from(item as Map);
                return ProjectModel.fromMap(m['id'] as String? ?? 'prj-${DateTime.now().millisecondsSinceEpoch}', m);
              })
              .toList();
          if (loadedProjects.isNotEmpty) {
            _projects
              ..clear()
              ..addAll(loadedProjects);
          }
        }

        if (data['entries'] is List) {
          final loadedEntries = (data['entries'] as List)
              .map((item) {
                final m = Map<String, dynamic>.from(item as Map);
                return TimeEntry.fromMap(m['id'] as String? ?? 'ent-${DateTime.now().millisecondsSinceEpoch}', m);
              })
              .toList();
          _entries
            ..clear()
            ..addAll(loadedEntries);
        }
      }
    } catch (e) {
      debugPrint('Local storage init note: $e');
    }

    _ensureDefaultAccounts();
    _saveToDisk();

    // Napojení na Firestore na pozadí (pokud má klient oprávnění)
    try {
      _firestore = FirebaseFirestore.instanceFor(
        app: Firebase.app(),
        databaseId: 'ai-studio-firemndochzkaaev-cf66a2c8-383c-4be5-bade-042d1600b80c',
      );
      _attachFirestoreSync();
    } catch (e) {
      debugPrint('Firestore background sync note: $e');
    }
  }

  void _ensureDefaultAccounts() {
    // Marek Dubina
    final bossIdx = _users.indexWhere(
      (u) => u.id == 'user-boss-marek-dubina' || u.email.toLowerCase() == 'marek.dubina@dochazka.cz',
    );
    if (bossIdx == -1) {
      _users.insert(0, _defaultUsers[0]);
    } else {
      _users[bossIdx] = _users[bossIdx].copyWith(
        role: 'admin',
        allowCustomRate: true,
        active: true,
        password: _users[bossIdx].password ?? 'MarekDubina4786',
      );
    }

    // Petr Lukeš
    final petrIdx = _users.indexWhere(
      (u) => u.id == 'user-worker-petr-lukes' || u.email.toLowerCase() == 'insanebad2@gmail.com',
    );
    if (petrIdx == -1) {
      _users.add(_defaultUsers[1]);
    } else {
      _users[petrIdx] = _users[petrIdx].copyWith(
        name: _users[petrIdx].name.isNotEmpty ? _users[petrIdx].name : 'Petr Lukeš',
        role: 'worker',
        defaultHourlyRate: _users[petrIdx].defaultHourlyRate == 350.0 ? 200.0 : _users[petrIdx].defaultHourlyRate,
        password: _users[petrIdx].password ?? 'Heslo0897@',
      );
    }

    if (_projects.isEmpty) {
      _projects.addAll(_defaultProjects);
    }
  }

  void _saveToDisk() {
    if (kIsWeb) return;
    try {
      final file = _getStorageFile();
      if (file == null) return;
      final payload = {
        'users': _users.map((u) => {'id': u.id, ...u.toMap()}).toList(),
        'projects': _projects.map((p) => {'id': p.id, ...p.toMap()}).toList(),
        'entries': _entries.map((e) {
          final m = Map<String, dynamic>.from(e.toMap());
          m['id'] = e.id;
          if (m['approvedAt'] is Timestamp) {
            m['approvedAt'] = (m['approvedAt'] as Timestamp).toDate().toIso8601String();
          }
          return m;
        }).toList(),
      };
      file.writeAsStringSync(jsonEncode(payload));
    } catch (_) {}
  }

  void _notifyListeners() {
    _saveToDisk();
    if (!_changeController.isClosed) {
      _changeController.add(null);
    }
  }

  void _attachFirestoreSync() {
    try {
      _firestore.collection('users').snapshots().listen((snap) {
        if (snap.docs.isEmpty) return;
        for (final doc in snap.docs) {
          final remote = AppUser.fromMap(doc.id, doc.data());
          final idx = _users.indexWhere(
            (u) => u.id == remote.id || (remote.email.isNotEmpty && u.email.toLowerCase() == remote.email.toLowerCase()),
          );
          if (idx == -1) {
            _users.add(remote);
          } else {
            _users[idx] = remote.copyWith(password: remote.password ?? _users[idx].password);
          }
        }
        _ensureDefaultAccounts();
        _notifyListeners();
      }, onError: (_) {});

      _firestore.collection('projects').snapshots().listen((snap) {
        if (snap.docs.isEmpty) return;
        for (final doc in snap.docs) {
          final remote = ProjectModel.fromMap(doc.id, doc.data());
          final idx = _projects.indexWhere((p) => p.id == remote.id);
          if (idx == -1) {
            _projects.add(remote);
          } else {
            _projects[idx] = remote;
          }
        }
        _notifyListeners();
      }, onError: (_) {});

      _firestore.collection('time_entries').snapshots().listen((snap) {
        if (snap.docs.isEmpty) return;
        for (final doc in snap.docs) {
          final remote = TimeEntry.fromMap(doc.id, doc.data());
          final idx = _entries.indexWhere((e) => e.id == remote.id);
          if (idx == -1) {
            _entries.add(remote);
          } else {
            _entries[idx] = remote;
          }
        }
        _notifyListeners();
      }, onError: (_) {});
    } catch (_) {}
  }

  Stream<T> _createReactiveStream<T>(T Function() getter) {
    late StreamController<T> controller;
    StreamSubscription<void>? sub;

    controller = StreamController<T>(
      onListen: () {
        controller.add(getter());
        sub = _changeController.stream.listen((_) {
          if (!controller.isClosed) {
            controller.add(getter());
          }
        });
      },
      onCancel: () {
        sub?.cancel();
      },
    );

    return controller.stream;
  }

  // ================= USERS =================

  List<AppUser> getUsersSync() {
    final copy = List<AppUser>.from(_users);
    copy.sort((a, b) => a.name.compareTo(b.name));
    return copy;
  }

  AppUser? findUserByEmailOrName(String identifier) {
    final clean = identifier.trim().toLowerCase();
    for (final u in _users) {
      if (u.email.toLowerCase() == clean || u.name.toLowerCase() == clean) {
        return u;
      }
    }
    return null;
  }

  Stream<AppUser?> streamUser(String uid) {
    return _createReactiveStream<AppUser?>(() {
      for (final u in _users) {
        if (u.id == uid) return u;
      }
      return null;
    });
  }

  Stream<List<AppUser>> streamAllUsers() {
    return _createReactiveStream<List<AppUser>>(() => getUsersSync());
  }

  Future<AppUser> addUser({
    required String name,
    required String email,
    required String role,
    required double defaultHourlyRate,
    required bool allowCustomRate,
    String? password,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    if (_users.any((u) => u.email.toLowerCase() == cleanEmail)) {
      throw Exception('Uživatel s tímto e-mailem již existuje.');
    }

    final newUser = AppUser(
      id: 'usr-${DateTime.now().millisecondsSinceEpoch}',
      name: name.trim(),
      email: cleanEmail,
      role: role,
      defaultHourlyRate: defaultHourlyRate,
      allowCustomRate: allowCustomRate,
      active: true,
      password: password != null && password.trim().isNotEmpty ? password.trim() : null,
    );

    _users.add(newUser);
    _notifyListeners();

    unawaited(
      _firestore
          .collection('users')
          .doc(newUser.id)
          .set(newUser.toMap(), SetOptions(merge: true))
          .catchError((_) {}),
    );

    return newUser;
  }

  Future<void> updateUser(AppUser user) async {
    final idx = _users.indexWhere(
      (u) => u.id == user.id || (user.email.isNotEmpty && u.email.toLowerCase() == user.email.toLowerCase()),
    );
    if (idx == -1) {
      _users.add(user);
    } else {
      _users[idx] = user.copyWith(password: user.password ?? _users[idx].password);
    }
    _notifyListeners();

    unawaited(
      _firestore
          .collection('users')
          .doc(user.id)
          .set(user.toMap(), SetOptions(merge: true))
          .catchError((_) {}),
    );
  }

  Future<void> deleteUser(String userId) async {
    _users.removeWhere((u) => u.id == userId);
    _notifyListeners();

    unawaited(
      _firestore.collection('users').doc(userId).delete().catchError((_) {}),
    );
  }

  // ================= PROJECTS =================

  List<ProjectModel> getProjectsSync() {
    final copy = List<ProjectModel>.from(_projects);
    copy.sort((a, b) => a.name.compareTo(b.name));
    return copy;
  }

  Stream<List<ProjectModel>> streamProjects() {
    return _createReactiveStream<List<ProjectModel>>(() => getProjectsSync());
  }

  Future<void> createProject({
    required String name,
    required String client,
    required double budgetLimitKcz,
  }) async {
    final project = ProjectModel(
      id: 'prj-${DateTime.now().millisecondsSinceEpoch}',
      name: name.trim(),
      client: client.trim(),
      status: 'open',
      budgetLimitKcz: budgetLimitKcz,
      createdAt: DateTime.now().toIso8601String(),
    );

    _projects.add(project);
    _notifyListeners();

    unawaited(
      _firestore
          .collection('projects')
          .doc(project.id)
          .set(project.toMap(), SetOptions(merge: true))
          .catchError((_) {}),
    );
  }

  Future<void> toggleProjectStatus(String projectId, String currentStatus) async {
    final nextStatus = currentStatus == 'open' ? 'closed' : 'open';
    final idx = _projects.indexWhere((p) => p.id == projectId);
    if (idx != -1) {
      _projects[idx] = _projects[idx].copyWith(status: nextStatus);
      _notifyListeners();
    }

    unawaited(
      _firestore
          .collection('projects')
          .doc(projectId)
          .set({'status': nextStatus}, SetOptions(merge: true))
          .catchError((_) {}),
    );
  }

  Future<void> deleteProject(String projectId) async {
    _projects.removeWhere((p) => p.id == projectId);
    _notifyListeners();

    unawaited(
      _firestore.collection('projects').doc(projectId).delete().catchError((_) {}),
    );
  }

  // ================= TIME ENTRIES =================

  List<TimeEntry> getWorkerEntriesSync(String uid) {
    final list = _entries.where((e) => e.userId == uid).toList();
    list.sort((a, b) => b.startTime.compareTo(a.startTime));
    return list;
  }

  List<TimeEntry> getAllEntriesSync() {
    final list = List<TimeEntry>.from(_entries);
    list.sort((a, b) => b.startTime.compareTo(a.startTime));
    return list;
  }

  Stream<List<TimeEntry>> streamWorkerEntries(String uid) {
    return _createReactiveStream<List<TimeEntry>>(() => getWorkerEntriesSync(uid));
  }

  Stream<List<TimeEntry>> streamAllEntries() {
    return _createReactiveStream<List<TimeEntry>>(() => getAllEntriesSync());
  }

  Future<bool> hasCollision({
    required String userId,
    required DateTime newStart,
    required DateTime newEnd,
    String? excludeEntryId,
  }) async {
    for (final entry in _entries) {
      if (entry.userId != userId) continue;
      if (excludeEntryId != null && entry.id == excludeEntryId) continue;
      if (entry.endTime == null) continue;

      final existingStart = DateTime.tryParse(entry.startTime);
      final existingEnd = DateTime.tryParse(entry.endTime!);
      if (existingStart == null || existingEnd == null) continue;

      if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
        return true;
      }
    }
    return false;
  }

  Future<String> startLiveShift({
    required AppUser user,
    required ProjectModel project,
    Map<String, dynamic>? startLocation,
  }) async {
    final now = DateTime.now();
    final id = 'ent-${now.millisecondsSinceEpoch}';
    final entry = TimeEntry(
      id: id,
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
      startLocation: startLocation,
    );

    _entries.insert(0, entry);
    _notifyListeners();

    unawaited(
      _firestore
          .collection('time_entries')
          .doc(id)
          .set(entry.toMap(), SetOptions(merge: true))
          .catchError((_) {}),
    );

    return id;
  }

  Future<void> stopLiveShift({
    required TimeEntry runningEntry,
    required DateTime endTime,
    required int breakMinutes,
    required String note,
    required double hourlyRate,
    required bool isCustomRate,
    required bool submitDirectly,
    Map<String, dynamic>? endLocation,
  }) async {
    final start = DateTime.parse(runningEntry.startTime);
    final totalDurationMinutes = endTime.difference(start).inMinutes;
    final netMinutes = (totalDurationMinutes - breakMinutes).clamp(0, 24 * 60);
    final hoursWorked = double.parse((netMinutes / 60.0).toStringAsFixed(2));
    final totalAmount = double.parse((hoursWorked * hourlyRate).toStringAsFixed(2));

    final updated = runningEntry.copyWith(
      endTime: endTime.toIso8601String(),
      breakMinutes: breakMinutes,
      hoursWorked: hoursWorked,
      hourlyRate: hourlyRate,
      isCustomRate: isCustomRate,
      totalAmount: totalAmount,
      note: note.trim(),
      status: submitDirectly ? 'pending' : 'draft',
      isRunning: false,
      endLocation: endLocation ?? runningEntry.endLocation,
    );

    final idx = _entries.indexWhere((e) => e.id == runningEntry.id);
    if (idx != -1) {
      _entries[idx] = updated;
    } else {
      _entries.insert(0, updated);
    }
    _notifyListeners();

    unawaited(
      _firestore
          .collection('time_entries')
          .doc(runningEntry.id)
          .set(updated.toMap(), SetOptions(merge: true))
          .catchError((_) {}),
    );
  }

  Future<void> createManualShift(TimeEntry entry) async {
    final id = entry.id.isNotEmpty ? entry.id : 'ent-${DateTime.now().millisecondsSinceEpoch}';
    final toSave = TimeEntry.fromMap(id, entry.toMap());
    _entries.insert(0, toSave);
    _notifyListeners();

    unawaited(
      _firestore
          .collection('time_entries')
          .doc(id)
          .set(toSave.toMap(), SetOptions(merge: true))
          .catchError((_) {}),
    );
  }

  Future<void> updateShift(TimeEntry entry) async {
    final idx = _entries.indexWhere((e) => e.id == entry.id);
    if (idx != -1) {
      _entries[idx] = entry;
    } else {
      _entries.insert(0, entry);
    }
    _notifyListeners();

    unawaited(
      _firestore
          .collection('time_entries')
          .doc(entry.id)
          .set(entry.toMap(), SetOptions(merge: true))
          .catchError((_) {}),
    );
  }

  Future<void> deleteShift(String entryId) async {
    _entries.removeWhere((e) => e.id == entryId);
    _notifyListeners();

    unawaited(
      _firestore.collection('time_entries').doc(entryId).delete().catchError((_) {}),
    );
  }

  Future<void> submitDraftForApproval(String entryId) async {
    final idx = _entries.indexWhere((e) => e.id == entryId);
    if (idx != -1) {
      _entries[idx] = _entries[idx].copyWith(status: 'pending');
      _notifyListeners();
      unawaited(
        _firestore
            .collection('time_entries')
            .doc(entryId)
            .set(_entries[idx].toMap(), SetOptions(merge: true))
            .catchError((_) {}),
      );
    }
  }

  Future<void> approveShift({
    required String entryId,
    required String adminUid,
  }) async {
    final idx = _entries.indexWhere((e) => e.id == entryId);
    if (idx != -1) {
      _entries[idx] = _entries[idx].copyWith(
        status: 'approved',
        approvedBy: adminUid,
        approvedAt: Timestamp.now(),
      );
      _notifyListeners();
      unawaited(
        _firestore
            .collection('time_entries')
            .doc(entryId)
            .set(_entries[idx].toMap(), SetOptions(merge: true))
            .catchError((_) {}),
      );
    }
  }

  Future<void> rejectShift({
    required String entryId,
    required String reason,
  }) async {
    final idx = _entries.indexWhere((e) => e.id == entryId);
    if (idx != -1) {
      _entries[idx] = _entries[idx].copyWith(
        status: 'rejected',
        adminComment: reason.trim(),
      );
      _notifyListeners();
      unawaited(
        _firestore
            .collection('time_entries')
            .doc(entryId)
            .set(_entries[idx].toMap(), SetOptions(merge: true))
            .catchError((_) {}),
      );
    }
  }

  Future<int> batchApproveAll(List<TimeEntry> pendingEntries, String adminUid) async {
    if (pendingEntries.isEmpty) return 0;
    final ids = pendingEntries.map((e) => e.id).toSet();
    final nowTs = Timestamp.now();
    int count = 0;

    for (int i = 0; i < _entries.length; i++) {
      if (ids.contains(_entries[i].id)) {
        _entries[i] = _entries[i].copyWith(
          status: 'approved',
          approvedBy: adminUid,
          approvedAt: nowTs,
        );
        count++;
        final updated = _entries[i];
        unawaited(
          _firestore
              .collection('time_entries')
              .doc(updated.id)
              .set(updated.toMap(), SetOptions(merge: true))
              .catchError((_) {}),
        );
      }
    }
    _notifyListeners();
    return count;
  }
}
