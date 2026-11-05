import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/time_entry.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import 'approval_tab.dart';
import 'projects_tab.dart';
import 'users_tab.dart';
import 'payroll_export_tab.dart';

class AdminDashboard extends StatefulWidget {
  final AppUser currentUser;
  final AuthService authService;
  final FirestoreService firestoreService;

  const AdminDashboard({
    super.key,
    required this.currentUser,
    required this.authService,
    required this.firestoreService,
  });

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<TimeEntry>>(
      stream: widget.firestoreService.streamAllEntries(),
      builder: (context, snapshot) {
        final allEntries = snapshot.data ?? [];
        final pendingCount = allEntries.where((e) => e.isPending).length;

        final screens = [
          ApprovalTab(
            currentUser: widget.currentUser,
            firestoreService: widget.firestoreService,
          ),
          ProjectsTab(firestoreService: widget.firestoreService),
          UsersTab(firestoreService: widget.firestoreService),
          PayrollExportTab(firestoreService: widget.firestoreService),
        ];

        return Scaffold(
          appBar: AppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Správa firmy a docházky', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                Text(
                  'Vedoucí: ${widget.currentUser.name} (${widget.currentUser.email})',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.logout),
                tooltip: 'Odhlásit se',
                onPressed: () => widget.authService.signOut(),
              ),
            ],
          ),
          body: screens[_currentIndex],
          bottomNavigationBar: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
            destinations: [
              NavigationDestination(
                icon: pendingCount > 0
                    ? Badge(
                        label: Text('$pendingCount'),
                        child: const Icon(Icons.playlist_add_check_outlined),
                      )
                    : const Icon(Icons.playlist_add_check_outlined),
                selectedIcon: pendingCount > 0
                    ? Badge(
                        label: Text('$pendingCount'),
                        child: const Icon(Icons.playlist_add_check),
                      )
                    : const Icon(Icons.playlist_add_check),
                label: 'Ke schválení',
              ),
              const NavigationDestination(
                icon: Icon(Icons.business_center_outlined),
                selectedIcon: Icon(Icons.business_center),
                label: 'Zakázky',
              ),
              const NavigationDestination(
                icon: Icon(Icons.people_outline),
                selectedIcon: Icon(Icons.people),
                label: 'Lidé',
              ),
              const NavigationDestination(
                icon: Icon(Icons.table_chart_outlined),
                selectedIcon: Icon(Icons.table_chart),
                label: 'Uzávěrka',
              ),
            ],
          ),
        );
      },
    );
  }
}
