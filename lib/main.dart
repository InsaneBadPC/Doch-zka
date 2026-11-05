import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_options.dart';
import 'services/auth_service.dart';
import 'services/firestore_service.dart';
import 'screens/role_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inicializace Firebase
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // Aktivace offline perzistence Firestore dle zadání
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  } catch (e) {
    debugPrint('Upozornění při inicializaci Firebase / offline cache: $e');
  }

  final authService = AuthService();
  final firestoreService = FirestoreService();

  runApp(DochazkaApp(
    authService: authService,
    firestoreService: firestoreService,
  ));
}

class DochazkaApp extends StatelessWidget {
  final AuthService authService;
  final FirestoreService firestoreService;

  const DochazkaApp({
    super.key,
    required this.authService,
    required this.firestoreService,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Firemní Docházka',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E293B),
          brightness: Brightness.light,
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E293B),
          brightness: Brightness.dark,
        ),
      ),
      themeMode: ThemeMode.system,
      home: RoleRouter(
        authService: authService,
        firestoreService: firestoreService,
      ),
    );
  }
}
