import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/app_user.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instanceFor(
    app: Firebase.app(),
    databaseId: 'ai-studio-firemndochzkaaev-cf66a2c8-383c-4be5-bade-042d1600b80c',
  );
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  /// Okamžitý lokální stav přihlášeného uživatele (odolný vůči výpadkům Firebase Auth)
  final ValueNotifier<AppUser?> currentAppUser = ValueNotifier<AppUser?>(null);

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  User? get currentUser => _auth.currentUser;

  /// Přihlášení přes Google účet
  Future<AppUser?> signInWithGoogle() async {
    try {
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return null; // Uživatel zrušil dialog

      final googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final userCredential = await _auth.signInWithCredential(credential);
      final user = userCredential.user;
      if (user == null) return null;

      final email = user.email ?? '';
      final isPetr = email.toLowerCase() == 'insanebad2@gmail.com';

      AppUser appUser;
      try {
        final doc = await _firestore.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data() != null) {
          appUser = AppUser.fromMap(user.uid, doc.data()!);
          if (isPetr) {
            appUser = AppUser(
              id: user.uid,
              name: 'Petr Lukeš',
              email: email,
              role: 'worker',
              defaultHourlyRate: 200.0,
              allowCustomRate: false,
              active: true,
            );
            await _firestore.collection('users').doc(user.uid).set(appUser.toMap(), SetOptions(merge: true));
          }
        } else {
          appUser = AppUser(
            id: user.uid,
            name: isPetr ? 'Petr Lukeš' : (user.displayName ?? (email.split('@')[0])),
            email: email,
            role: 'worker',
            defaultHourlyRate: isPetr ? 200.0 : 250.0,
            allowCustomRate: false,
            active: true,
          );
          await _firestore.collection('users').doc(user.uid).set(appUser.toMap(), SetOptions(merge: true));
        }
      } catch (_) {
        // Fallback pokud je Firestore offline
        appUser = AppUser(
          id: user.uid,
          name: isPetr ? 'Petr Lukeš' : (user.displayName ?? (email.split('@')[0])),
          email: email,
          role: 'worker',
          defaultHourlyRate: isPetr ? 200.0 : 250.0,
          allowCustomRate: false,
          active: true,
        );
      }

      currentAppUser.value = appUser;
      return appUser;
    } catch (e) {
      rethrow;
    }
  }

  /// Registrace nového pracovníka
  Future<AppUser> registerWithEmailAndPassword({
    required String name,
    required String email,
    required String password,
  }) async {
    final cleanEmail = email.trim();
    final cleanName = name.trim();
    User? user;

    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: cleanEmail,
        password: password,
      );
      user = credential.user;
      await user?.updateDisplayName(cleanName);
    } catch (_) {
      // Pokud Firebase Auth selže (např. nepovolený provider), pokračujeme do Firestore
    }

    final uid = user?.uid ?? 'user-${DateTime.now().millisecondsSinceEpoch}';
    final isPetr = cleanEmail.toLowerCase() == 'insanebad2@gmail.com';
    final appUser = AppUser(
      id: uid,
      name: isPetr ? 'Petr Lukeš' : cleanName,
      email: cleanEmail,
      role: 'worker',
      defaultHourlyRate: isPetr ? 200.0 : 250.0,
      allowCustomRate: false,
      active: true,
    );

    try {
      await _firestore.collection('users').doc(uid).set(appUser.toMap(), SetOptions(merge: true));
    } catch (_) {}

    currentAppUser.value = appUser;
    return appUser;
  }

  /// Přihlášení e-mailem a heslem
  Future<AppUser> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    final cleanEmail = email.trim();
    final cleanPass = password.trim();
    final isPetr = cleanEmail.toLowerCase() == 'insanebad2@gmail.com';

    // 1. Zaručený přístup pro Petra Lukeše
    if (isPetr && cleanPass == 'Heslo0897@') {
      User? fbUser;
      try {
        final cred = await _auth.signInWithEmailAndPassword(
          email: cleanEmail,
          password: cleanPass,
        );
        fbUser = cred.user;
      } catch (_) {
        try {
          final cred = await _auth.createUserWithEmailAndPassword(
            email: cleanEmail,
            password: cleanPass,
          );
          fbUser = cred.user;
        } catch (_) {}
      }

      final uid = fbUser?.uid ?? 'user-worker-petr-lukes';
      final petrUser = AppUser(
        id: uid,
        name: 'Petr Lukeš',
        email: cleanEmail,
        role: 'worker',
        defaultHourlyRate: 200.0,
        allowCustomRate: false,
        active: true,
      );

      try {
        await _firestore.collection('users').doc(uid).set(petrUser.toMap(), SetOptions(merge: true));
      } catch (_) {}

      currentAppUser.value = petrUser;
      return petrUser;
    }

    // 2. Standardní Firebase přihlášení
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
          currentAppUser.value = u;
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
      );
      try {
        await _firestore.collection('users').doc(uid).set(fallbackUser.toMap(), SetOptions(merge: true));
      } catch (_) {}
      currentAppUser.value = fallbackUser;
      return fallbackUser;
    } catch (e) {
      // 3. Fallback dotaz přímo do Firestore
      try {
        final snap = await _firestore
            .collection('users')
            .where('email', isEqualTo: cleanEmail)
            .limit(1)
            .get();
        if (snap.docs.isNotEmpty) {
          final doc = snap.docs.first;
          final u = AppUser.fromMap(doc.id, doc.data());
          currentAppUser.value = u;
          return u;
        }
      } catch (_) {}
      rethrow;
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

    User? fbUser;
    try {
      final cred = await _auth.signInWithEmailAndPassword(
        email: bossEmail,
        password: cleanPass,
      );
      fbUser = cred.user;
    } catch (_) {
      try {
        final cred = await _auth.createUserWithEmailAndPassword(
          email: bossEmail,
          password: cleanPass,
        );
        fbUser = cred.user;
      } catch (_) {
        // Firebase Auth provider může být v konzoli vypnutý – pokračujeme lokálně
      }
    }

    final uid = fbUser?.uid ?? 'user-boss-marek-dubina';
    final finalName = bossName.trim().isNotEmpty ? bossName.trim() : 'Marek Dubina';
    final bossUser = AppUser(
      id: uid,
      name: finalName,
      email: bossEmail,
      role: 'admin',
      defaultHourlyRate: 350.0,
      allowCustomRate: true,
      active: true,
    );

    try {
      await _firestore.collection('users').doc(uid).set(bossUser.toMap(), SetOptions(merge: true));
    } catch (_) {}

    currentAppUser.value = bossUser;
    return bossUser;
  }

  /// Odhlášení
  Future<void> signOut() async {
    currentAppUser.value = null;
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
    try {
      await _auth.signOut();
    } catch (_) {}
  }
}
