import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/app_user.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

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

      final doc = await _firestore.collection('users').doc(user.uid).get();
      if (doc.exists) {
        return AppUser.fromMap(doc.data()!);
      }

      final isOwner = user.email?.toLowerCase() == 'insanebad2@gmail.com';
      final appUser = AppUser(
        id: user.uid,
        name: user.displayName ?? (user.email?.split('@')[0] ?? 'Pracovník'),
        email: user.email ?? '',
        role: isOwner ? 'admin' : 'worker',
        defaultHourlyRate: isOwner ? 350.0 : 250.0,
        allowCustomRate: isOwner,
        active: true,
      );
      await _firestore.collection('users').doc(user.uid).set(appUser.toMap());
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
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final user = credential.user;
    if (user == null) {
      throw Exception('Registrace selhala – uživatel nebyl vytvořen.');
    }

    // Aktualizace displayName
    await user.updateDisplayName(name.trim());

    // Uložení do kolekce users dle zadání
    final appUser = AppUser(
      id: user.uid,
      name: name.trim(),
      email: email.trim(),
      role: 'worker', // Vždy výchozí worker
      defaultHourlyRate: 250.0,
      allowCustomRate: false,
      active: true,
    );

    await _firestore.collection('users').doc(user.uid).set(appUser.toMap());
    return appUser;
  }

  /// Přihlášení e-mailem a heslem
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    return await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
  }

  /// Přihlášení vedení (Marek Dubina)
  Future<AppUser> signInBoss({
    required String bossName,
    required String password,
  }) async {
    const bossEmail = 'marek.dubina@dochazka.cz';
    if (password != 'MarekDubina4786') {
      throw Exception('Nesprávné heslo pro přístup vedení.');
    }

    try {
      final cred = await _auth.signInWithEmailAndPassword(
        email: bossEmail,
        password: password,
      );
      final uid = cred.user!.uid;
      final doc = await _firestore.collection('users').doc(uid).get();
      if (doc.exists) {
        return AppUser.fromMap(doc.data()!);
      }
      final bossUser = AppUser(
        id: uid,
        name: bossName.trim().isNotEmpty ? bossName.trim() : 'Marek Dubina',
        email: bossEmail,
        role: 'admin',
        defaultHourlyRate: 350.0,
        allowCustomRate: true,
        active: true,
      );
      await _firestore.collection('users').doc(uid).set(bossUser.toMap());
      return bossUser;
    } on FirebaseAuthException catch (e) {
      if (e.code == 'user-not-found' || e.code == 'invalid-credential') {
        final cred = await _auth.createUserWithEmailAndPassword(
          email: bossEmail,
          password: password,
        );
        final uid = cred.user!.uid;
        final bossUser = AppUser(
          id: uid,
          name: bossName.trim().isNotEmpty ? bossName.trim() : 'Marek Dubina',
          email: bossEmail,
          role: 'admin',
          defaultHourlyRate: 350.0,
          allowCustomRate: true,
          active: true,
        );
        await _firestore.collection('users').doc(uid).set(bossUser.toMap());
        return bossUser;
      }
      rethrow;
    }
  }

  /// Odhlášení
  Future<void> signOut() async {
    await _auth.signOut();
  }
}
