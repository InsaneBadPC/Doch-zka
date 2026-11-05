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

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: authService.authStateChanges,
      builder: (context, authSnapshot) {
        if (authSnapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
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
                body: Center(child: CircularProgressIndicator()),
              );
            }

            final appUser = userSnapshot.data;
            if (appUser == null) {
              // Profil se ještě vytváří nebo nebyl nalezen
              return Scaffold(
                body: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      const Text('Načítání profilu uživatele...'),
                      const SizedBox(height: 24),
                      TextButton(
                        onPressed: () => authService.signOut(),
                        child: const Text('Zpět na přihlášení'),
                      ),
                    ],
                  ),
                ),
              );
            }

            // Kontrola deaktivace účtu
            if (!appUser.active) {
              return Scaffold(
                appBar: AppBar(
                  title: const Text('Účet uzamčen'),
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
                          color: Colors.redAccent,
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Váš účet byl deaktivován správcem',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Nemáte povolen přístup do firemní docházky. Pro obnovení přístupu prosím kontaktujte svého nadřízeného.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey),
                        ),
                        const SizedBox(height: 32),
                        FilledButton.icon(
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

            // Rozcestník podle role
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
          },
        );
      },
    );
  }
}
