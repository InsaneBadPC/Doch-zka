import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_options.dart';
import 'services/auth_service.dart';
import 'services/firestore_service.dart';
import 'screens/role_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    final dbInstance = FirebaseFirestore.instanceFor(
      app: Firebase.app(),
      databaseId: 'ai-studio-firemndochzkaaev-cf66a2c8-383c-4be5-bade-042d1600b80c',
    );
    dbInstance.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  } catch (e) {
    debugPrint('Upozornění při inicializaci Firebase / offline cache: $e');
  }

  final firestoreService = FirestoreService();
  final authService = AuthService();

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
    final darkFintechTheme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF090B0A),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFFD4F73C),
        onPrimary: Color(0xFF090B0A),
        secondary: Color(0xFFF59E0B),
        onSecondary: Color(0xFF090B0A),
        surface: Color(0xFF121513),
        onSurface: Colors.white,
        error: Color(0xFFFF5B65),
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF121513),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF232A23)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF090B0A),
        foregroundColor: Colors.white,
        centerTitle: false,
        elevation: 0,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: const Color(0xFF121513),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: Color(0xFF232A23)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF121513),
        indicatorColor: const Color(0xFFD4F73C).withOpacity(0.2),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: Color(0xFFD4F73C));
          }
          return const IconThemeData(color: Color(0xFF8E929E));
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Color(0xFFD4F73C),
            );
          }
          return const TextStyle(
            fontSize: 12,
            color: Color(0xFF8E929E),
          );
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFFD4F73C),
          foregroundColor: const Color(0xFF090B0A),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF0A0D0B),
        labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF232A23)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFD4F73C), width: 1.5),
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF232A23)),
        ),
      ),
    );

    return MaterialApp(
      title: 'Firemní Docházka',
      debugShowCheckedModeBanner: false,
      theme: darkFintechTheme,
      darkTheme: darkFintechTheme,
      themeMode: ThemeMode.dark,
      home: RoleRouter(
        authService: authService,
        firestoreService: firestoreService,
      ),
    );
  }
}
