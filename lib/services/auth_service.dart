import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/app_user.dart';
import 'firestore_service.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: 'ai-studio-firemndochzkaaev-cf66a2c8-383c-4be5-bade-042d1600b80c',
  );
  final GoogleSignIn _googleSignIn = GoogleSignIn();
  final FirestoreService _store = FirestoreService();

  /// Okamžitý lokální stav přihlášeného uživatele
  final ValueNotifier<AppUser?> currentAppUser = ValueNotifier<AppUser?>(null);

  AuthService() {
    _restoreSession();
  }

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  File? _getSessionFile() {
    if (kIsWeb) return null;
    try {
      final candidates = [
        '/data/user/0/cz.dochazka.dochazka_app/files/dochazka_session_v3.json',
        '/data/data/cz.dochazka.dochazka_app/files/dochazka_session_v3.json',
        '${Directory.systemTemp.path}/dochazka_session_v3.json',
      ];
      for (final path in candidates) {
        try {
          final file = File(path);
          if (file.parent.existsSync()) return file;
        } catch (_) {}
      }
      return File('${Directory.systemTemp.path}/dochazka_session_v3.json');
    } catch (_) {
      return null;
    }
  }

  void _restoreSession() {
    if (kIsWeb) return;
    try {
      final file = _getSessionFile();
      if (file != null && file.existsSync()) {
        final raw = file.readAsStringSync();
        final data = jsonDecode(raw) as Map<String, dynamic>;
        final id = data['id'] as String?;
        if (id != null && id.isNotEmpty) {
          final fresh = _store.getUsersSync().where((u) => u.id == id).toList();
          if (fresh.isNotEmpty) {
            currentAppUser.value = fresh.first;
          } else {
            currentAppUser.value = AppUser.fromMap(id, data);
          }
        }
      }
    } catch (_) {}
  }

  void _persistSession(AppUser? user) {
    currentAppUser.value = user;
    if (kIsWeb) return;
    try {
      final file = _getSessionFile();
      if (file == null) return;
      if (user == null) {
        if (file.existsSync()) file.deleteSync();
      } else {
        file.writeAsStringSync(jsonEncode({'id': user.id, ...user.toMap()}));
      }
    } catch (_) {}
  }

  /// Přihlášení přes Google účet
  Future<AppUser?> signInWithGoogle() async {
    try {
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return null;

      try {
        final googleAuth = await googleUser.authentication;
        if (googleAuth.accessToken != null || googleAuth.idToken != null) {
          final credential = GoogleAuthProvider.credential(
            accessToken: googleAuth.accessToken,
            idToken: googleAuth.idToken,
          );
          await _auth.signInWithCredential(credential);
        }
      } catch (_) {}

      return await signInWithGoogleAccount(
        email: googleUser.email,
        displayName: googleUser.displayName,
        uid: googleUser.id,
      );
    } catch (e) {
      rethrow;
    }
  }

  /// Přihlášení přes vybraný Google účet (včetně přímého výběru při absenci OAuth SHA-1)
  Future<AppUser> signInWithGoogleAccount({
    required String email,
    String? displayName,
    String? uid,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    final isPetr = cleanEmail == 'insanebad2@gmail.com';
    final isBoss = cleanEmail == 'marek.dubina@dochazka.cz';
    final existing = _store.findUserByEmailOrName(cleanEmail);

    final fallbackName = isBoss
        ? 'Marek Dubina'
        : (isPetr
            ? 'Petr Lukeš'
            : (displayName != null && displayName.trim().isNotEmpty
                ? displayName.trim()
                : cleanEmail.split('@')[0]));

    final appUser = existing != null
        ? existing.copyWith(
            name: isPetr ? 'Petr Lukeš' : (existing.name.isNotEmpty ? existing.name : fallbackName),
            defaultHourlyRate: isPetr ? 200.0 : existing.defaultHourlyRate,
            active: true,
          )
        : AppUser(
            id: isBoss
                ? 'user-boss-marek-dubina'
                : (isPetr
                    ? 'user-worker-petr-lukes'
                    : (uid != null && uid.isNotEmpty ? 'g-$uid' : 'usr-${DateTime.now().millisecondsSinceEpoch}')),
            name: fallbackName,
            email: cleanEmail,
            role: isBoss ? 'admin' : 'worker',
            defaultHourlyRate: isBoss ? 350.0 : (isPetr ? 200.0 : 250.0),
            allowCustomRate: isBoss,
            active: true,
          );

    await _store.updateUser(appUser);
    _persistSession(appUser);
    return appUser;
  }

  /// Registrace nového pracovníka
  Future<AppUser> registerWithEmailAndPassword({
    required String name,
    required String email,
    required String password,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    final cleanName = name.trim();
    final cleanPass = password.trim();

    if (_store.findUserByEmailOrName(cleanEmail) != null) {
      throw Exception('email-already-in-use');
    }

    User? user;
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: cleanEmail,
        password: cleanPass,
      );
      user = credential.user;
      await user?.updateDisplayName(cleanName);
    } catch (_) {}

    final uid = user?.uid ?? 'usr-${DateTime.now().millisecondsSinceEpoch}';
    final isPetr = cleanEmail == 'insanebad2@gmail.com';
    final appUser = AppUser(
      id: uid,
      name: isPetr ? 'Petr Lukeš' : cleanName,
      email: cleanEmail,
      role: 'worker',
      defaultHourlyRate: isPetr ? 200.0 : 250.0,
      allowCustomRate: false,
      active: true,
      password: cleanPass,
    );

    await _store.updateUser(appUser);
    _persistSession(appUser);
    return appUser;
  }

  /// Přihlášení e-mailem a heslem
  Future<AppUser> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    final cleanPass = password.trim();

    // 0. Pokud zadal údaje šéfa do formuláře pracovníka
    if ((cleanEmail == 'marek.dubina@dochazka.cz' || cleanEmail == 'marek dubina') &&
        cleanPass == 'MarekDubina4786') {
      return signInBoss(bossName: 'Marek Dubina', password: cleanPass);
    }

    // 1. Zaručený přístup pro Petra Lukeše
    if (cleanEmail == 'insanebad2@gmail.com' && cleanPass == 'Heslo0897@') {
      final existing = _store.findUserByEmailOrName(cleanEmail);
      final petrUser = existing != null
          ? existing.copyWith(
              name: 'Petr Lukeš',
              role: 'worker',
              defaultHourlyRate: 200.0,
              active: true,
              password: cleanPass,
            )
          : AppUser(
              id: 'user-worker-petr-lukes',
              name: 'Petr Lukeš',
              email: cleanEmail,
              role: 'worker',
              defaultHourlyRate: 200.0,
              allowCustomRate: false,
              active: true,
              password: cleanPass,
            );

      await _store.updateUser(petrUser);
      _persistSession(petrUser);
      return petrUser;
    }

    // 2. Kontrola v lokálním / synchronizovaném úložišti (zaměstnanci vytvoření šéfem nebo registrovaní)
    final localFound = _store.findUserByEmailOrName(cleanEmail);
    if (localFound != null) {
      if (localFound.password != null &&
          localFound.password!.isNotEmpty &&
          localFound.password != cleanPass) {
        throw Exception('invalid-credential');
      }
      final updated = localFound.password == null || localFound.password!.isEmpty
          ? localFound.copyWith(password: cleanPass)
          : localFound;
      await _store.updateUser(updated);
      _persistSession(updated);
      return updated;
    }

    // 3. Pokus o přihlášení přes Firebase Auth
    try {
      final cred = await _auth.signInWithEmailAndPassword(
        email: cleanEmail,
        password: cleanPass,
      );
      final uid = cred.user!.uid;
      try {
        final doc = await _firestore.collection('users').doc(uid).get();
        if (doc.exists && doc.data() != null) {
          final u = AppUser.fromMap(uid, doc.data()!);
          await _store.updateUser(u);
          _persistSession(u);
          return u;
        }
      } catch (_) {}

      final fallbackUser = AppUser(
        id: uid,
        name: cred.user!.displayName ?? cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'worker',
        defaultHourlyRate: 250.0,
        allowCustomRate: false,
        active: true,
        password: cleanPass,
      );
      await _store.updateUser(fallbackUser);
      _persistSession(fallbackUser);
      return fallbackUser;
    } catch (_) {
      throw Exception('invalid-credential');
    }
  }

  /// Přihlášení vedení (Marek Dubina)
  Future<AppUser> signInBoss({
    required String bossName,
    required String password,
  }) async {
    const bossEmail = 'marek.dubina@dochazka.cz';
    final cleanPass = password.trim();

    if (cleanPass != 'MarekDubina4786') {
      throw Exception('Nesprávné heslo pro přístup vedení.');
    }

    final finalName = bossName.trim().isNotEmpty ? bossName.trim() : 'Marek Dubina';
    final existing = _store.findUserByEmailOrName(bossEmail);

    final bossUser = existing != null
        ? existing.copyWith(
            name: finalName,
            email: bossEmail,
            role: 'admin',
            allowCustomRate: true,
            active: true,
            password: cleanPass,
          )
        : AppUser(
            id: 'user-boss-marek-dubina',
            name: finalName,
            email: bossEmail,
            role: 'admin',
            defaultHourlyRate: 350.0,
            allowCustomRate: true,
            active: true,
            password: cleanPass,
          );

    await _store.updateUser(bossUser);
    _persistSession(bossUser);
    return bossUser;
  }

  /// Odhlášení
  Future<void> signOut() async {
    _persistSession(null);
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
    try {
      await _auth.signOut();
    } catch (_) {}
  }
}
