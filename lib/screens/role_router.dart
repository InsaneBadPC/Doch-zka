import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/app_user.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import 'auth_screen.dart';
import 'worker/worker_dashboard.dart';
import 'admin/admin_dashboard.dart';

class RoleRouter extends StatelessWidget {
  final AuthService authService;
  final FirestoreService firestoreService;

  const RoleRouter({
    super.key,
    required this.authService,
    required this.firestoreService,
  });

  Widget _buildRoleView(BuildContext context, AppUser appUser) {
    if (!appUser.active) {
      return Scaffold(
        backgroundColor: const Color(0xFF090B0A),
        appBar: AppBar(
          title: const Text('Účet uzamčen', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          backgroundColor: const Color(0xFF121513),
          centerTitle: true,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.lock_person,
                  size: 72,
                  color: Color(0xFFFF5B65),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Váš účet byl deaktivován správcem',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Nemáte povolen přístup do firemní docházky. Pro obnovení přístupu prosím kontaktujte svého nadřízeného.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF8E929E)),
                ),
                const SizedBox(height: 32),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF1F2421),
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () => authService.signOut(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Odhlásit se'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (appUser.isAdmin) {
      return AdminDashboard(
        currentUser: appUser,
        authService: authService,
        firestoreService: firestoreService,
      );
    } else {
      return WorkerDashboard(
        currentUser: appUser,
        authService: authService,
        firestoreService: firestoreService,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppUser?>(
      valueListenable: authService.currentAppUser,
      builder: (context, directUser, _) {
        if (directUser != null) {
          return _buildRoleView(context, directUser);
        }

        return StreamBuilder<User?>(
          stream: authService.authStateChanges,
          builder: (context, authSnapshot) {
            if (authSnapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                backgroundColor: Color(0xFF090B0A),
                body: Center(
                  child: CircularProgressIndicator(color: Color(0xFFD4F73C)),
                ),
              );
            }

            final firebaseUser = authSnapshot.data;
            if (firebaseUser == null) {
              return AuthScreen(
                authService: authService,
                firestoreService: firestoreService,
              );
            }

            return StreamBuilder<AppUser?>(
              stream: firestoreService.streamUser(firebaseUser.uid),
              builder: (context, userSnapshot) {
                if (userSnapshot.connectionState == ConnectionState.waiting) {
                  return const Scaffold(
                    backgroundColor: Color(0xFF090B0A),
                    body: Center(
                      child: CircularProgressIndicator(color: Color(0xFFD4F73C)),
                    ),
                  );
                }

                var appUser = userSnapshot.data;
                if (appUser == null) {
                  final email = firebaseUser.email ?? '';
                  final isBoss = email.toLowerCase() == 'marek.dubina@dochazka.cz';
                  final isPetr = email.toLowerCase() == 'insanebad2@gmail.com';
                  appUser = AppUser(
                    id: firebaseUser.uid,
                    name: isBoss
                        ? 'Marek Dubina'
                        : (isPetr
                            ? 'Petr Lukeš'
                            : (firebaseUser.displayName ?? (email.split('@')[0]))),
                    email: email,
                    role: isBoss ? 'admin' : 'worker',
                    defaultHourlyRate: isBoss ? 350.0 : (isPetr ? 200.0 : 250.0),
                    allowCustomRate: isBoss,
                    active: true,
                  );
                  // Uložíme profil, aby byl v DB k dispozici
                  firestoreService.updateUser(appUser);
                }

                return _buildRoleView(context, appUser);
              },
            );
          },
        );
      },
    );
  }
}
