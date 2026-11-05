import 'package:flutter/material.dart';
import '../../models/app_user.dart';
import '../../models/time_entry.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../worker/worker_dashboard.dart';
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
  bool _viewAsWorker = false;

  @override
  Widget build(BuildContext context) {
    if (_viewAsWorker) {
      return Scaffold(
        backgroundColor: const Color(0xFF090B0A),
        body: Column(
          children: [
            SafeArea(
              bottom: false,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: const BoxDecoration(
                  color: Color(0xFF121513),
                  border: Border(bottom: BorderSide(color: Color(0xFF232A23))),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.visibility, size: 16, color: Color(0xFFD4F73C)),
                        SizedBox(width: 8),
                        Text(
                          'Pohled pracovníka (Admin)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                    TextButton.icon(
                      onPressed: () => setState(() => _viewAsWorker = false),
                      icon: const Icon(Icons.shield, size: 15, color: Color(0xFFD4F73C)),
                      label: const Text(
                        'Zpět do správy (Šéf)',
                        style: TextStyle(color: Color(0xFFD4F73C), fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: WorkerDashboard(
                currentUser: widget.currentUser,
                authService: widget.authService,
                firestoreService: widget.firestoreService,
              ),
            ),
          ],
        ),
      );
    }

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
          backgroundColor: const Color(0xFF090B0A),
          appBar: AppBar(
            backgroundColor: const Color(0xFF090B0A),
            surfaceTintColor: Colors.transparent,
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(color: const Color(0xFF1E251E), height: 1),
            ),
            title: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFD4F73C),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: const Icon(Icons.access_time_filled, color: Color(0xFF090B0A), size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'DOCHÁZKA PRO',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                      Text(
                        'Šéf: ${widget.currentUser.name}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              TextButton.icon(
                style: TextButton.styleFrom(
                  backgroundColor: const Color(0xFF121513),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: Color(0xFF232A23)),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                ),
                onPressed: () => setState(() => _viewAsWorker = true),
                icon: const Icon(Icons.person_outline, size: 16, color: Color(0xFFD4F73C)),
                label: const Text(
                  'Pracovník',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
              const SizedBox(width: 6),
              IconButton(
                icon: const Icon(Icons.logout, color: Color(0xFF94A3B8)),
                tooltip: 'Odhlásit se',
                onPressed: () => widget.authService.signOut(),
              ),
            ],
          ),
          body: screens[_currentIndex],
          bottomNavigationBar: Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFF1E251E))),
            ),
            child: NavigationBar(
              selectedIndex: _currentIndex,
              onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
              destinations: [
                NavigationDestination(
                  icon: pendingCount > 0
                      ? Badge(
                          backgroundColor: const Color(0xFFFF5B65),
                          label: Text('$pendingCount', style: const TextStyle(color: Colors.white)),
                          child: const Icon(Icons.playlist_add_check_outlined),
                        )
                      : const Icon(Icons.playlist_add_check_outlined),
                  selectedIcon: pendingCount > 0
                      ? Badge(
                          backgroundColor: const Color(0xFFFF5B65),
                          label: Text('$pendingCount', style: const TextStyle(color: Colors.white)),
                          child: const Icon(Icons.playlist_add_check),
                        )
                      : const Icon(Icons.playlist_add_check),
                  label: 'Schválení',
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
                  label: 'Výplaty',
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
