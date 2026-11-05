import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';

class AuthScreen extends StatefulWidget {
  final AuthService authService;
  final FirestoreService firestoreService;

  const AuthScreen({
    super.key,
    required this.authService,
    required this.firestoreService,
  });

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  // Pracovník
  bool _isRegister = false;
  final _workerFormKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isWorkerPasswordVisible = false;

  // Šéf
  final _bossFormKey = GlobalKey<FormState>();
  final _bossNameController = TextEditingController(text: 'Marek Dubina');
  final _bossPasswordController = TextEditingController();
  bool _isBossPasswordVisible = false;

  bool _isWorkerLoading = false;
  bool _isBossLoading = false;
  bool _isGoogleLoading = false;
  String? _workerError;
  String? _bossError;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _bossNameController.dispose();
    _bossPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submitGoogle() async {
    setState(() {
      _isGoogleLoading = true;
      _workerError = null;
    });

    try {
      final user = await widget.authService.signInWithGoogle();
      if (user == null) {
        return;
      }
    } catch (e) {
      setState(() {
        _workerError = 'Přihlášení přes Google vyžaduje propojení. Přihlaste se prosím e-mailem a heslem níže.';
      });
    } finally {
      if (mounted) setState(() => _isGoogleLoading = false);
    }
  }

  Future<void> _submitWorker() async {
    if (!_workerFormKey.currentState!.validate()) return;

    setState(() {
      _isWorkerLoading = true;
      _workerError = null;
    });

    try {
      if (_isRegister) {
        await widget.authService.registerWithEmailAndPassword(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
      } else {
        await widget.authService.signInWithEmailAndPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
      }
    } catch (e) {
      setState(() {
        final err = e.toString();
        if (err.contains('user-not-found') ||
            err.contains('wrong-password') ||
            err.contains('invalid-credential')) {
          _workerError = 'Nesprávný e-mail nebo heslo.';
        } else if (err.contains('email-already-in-use')) {
          _workerError = 'Tento e-mail je již zaregistrován.';
        } else if (err.contains('weak-password')) {
          _workerError = 'Heslo musí mít alespoň 6 znaků.';
        } else {
          _workerError = 'Chyba přihlášení: $e';
        }
      });
    } finally {
      if (mounted) setState(() => _isWorkerLoading = false);
    }
  }

  Future<void> _submitBoss() async {
    if (!_bossFormKey.currentState!.validate()) return;

    setState(() {
      _isBossLoading = true;
      _bossError = null;
    });

    try {
      await widget.authService.signInBoss(
        bossName: _bossNameController.text.trim(),
        password: _bossPasswordController.text,
      );
    } catch (e) {
      setState(() {
        _bossError = 'Nesprávné heslo pro přístup správce.';
      });
    } finally {
      if (mounted) setState(() => _isBossLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090B0A),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 860),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Logo + Název aplikace
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFFD4F73C),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFD4F73C).withOpacity(0.25),
                              blurRadius: 16,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.access_time_filled,
                          color: Color(0xFF090B0A),
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'DOCHÁZKA',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                          Text(
                            'Evidence zakázek a směn',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Layout pro mobily i tablety: 2 oddělené karty vedle sebe nebo pod sebou
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isWide = constraints.maxWidth >= 720;
                      if (isWide) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: _buildWorkerCard()),
                            const SizedBox(width: 20),
                            Expanded(child: _buildBossCard()),
                          ],
                        );
                      } else {
                        return Column(
                          children: [
                            _buildWorkerCard(),
                            const SizedBox(height: 20),
                            _buildBossCard(),
                          ],
                        );
                      }
                    },
                  ),

                  const SizedBox(height: 20),
                  // Spodní informace
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.lock_outline, size: 14, color: Color(0xFFD4F73C)),
                      SizedBox(width: 6),
                      Text(
                        'Zabezpečené šifrované spojení',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // 1. Karta pro pracovníka
  Widget _buildWorkerCard() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF232A23)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Form(
        key: _workerFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Záhlaví karty pracovníka
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1C251C),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF2B392B)),
                  ),
                  child: const Icon(
                    Icons.person,
                    color: Color(0xFFD4F73C),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Přihlášení pracovníka',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                // Přepínač přihlášení / registrace
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF0A0D0B),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF222922)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GestureDetector(
                        onTap: () => setState(() {
                          _isRegister = false;
                          _workerError = null;
                        }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: !_isRegister ? const Color(0xFFD4F73C) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Vstup',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: !_isRegister ? const Color(0xFF090B0A) : const Color(0xFF94A3B8),
                            ),
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => setState(() {
                          _isRegister = true;
                          _workerError = null;
                        }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: _isRegister ? const Color(0xFFD4F73C) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Registrace',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _isRegister ? const Color(0xFF090B0A) : const Color(0xFF94A3B8),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(color: Color(0xFF1E251E), height: 28),

            if (_workerError != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF2A1516),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFF5B65).withOpacity(0.4)),
                ),
                child: Text(
                  _workerError!,
                  style: const TextStyle(color: Color(0xFFFF5B65), fontSize: 12),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Google přihlášení jedním klikem
            OutlinedButton(
              onPressed: _isGoogleLoading ? null : _submitGoogle,
              style: OutlinedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF090B0A),
                side: const BorderSide(color: Colors.white),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _isGoogleLoading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF090B0A)),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.g_mobiledata, color: Color(0xFF4285F4), size: 28),
                        SizedBox(width: 6),
                        Text(
                          'Přihlásit se přes Google',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 14),

            const Row(
              children: [
                Expanded(child: Divider(color: Color(0xFF1E251E))),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 10),
                  child: Text(
                    'nebo e-mailem a heslem',
                    style: TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 10,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
                Expanded(child: Divider(color: Color(0xFF1E251E))),
              ],
            ),
            const SizedBox(height: 14),

            if (_isRegister) ...[
              const Text(
                'Jméno a příjmení *',
                style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: _inputDecoration('Jan Novák', Icons.person_outline),
                validator: (val) {
                  if (_isRegister && (val == null || val.trim().isEmpty)) {
                    return 'Zadejte prosím své celé jméno';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),
            ],

            const Text(
              'E-mailová adresa *',
              style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: _inputDecoration('vas@email.cz', Icons.alternate_email),
              validator: (val) {
                if (val == null || !val.contains('@')) {
                  return 'Zadejte platnou e-mailovou adresu';
                }
                return null;
              },
            ),
            const SizedBox(height: 14),

            const Text(
              'Heslo *',
              style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _passwordController,
              obscureText: !_isWorkerPasswordVisible,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: _inputDecoration('••••••••', Icons.lock_outline).copyWith(
                suffixIcon: IconButton(
                  icon: Icon(
                    _isWorkerPasswordVisible ? Icons.visibility_off : Icons.visibility,
                    color: const Color(0xFF64748B),
                    size: 18,
                  ),
                  onPressed: () => setState(() => _isWorkerPasswordVisible = !_isWorkerPasswordVisible),
                ),
              ),
              validator: (val) {
                if (val == null || val.length < 6) {
                  return 'Heslo musí mít alespoň 6 znaků';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            FilledButton(
              onPressed: _isWorkerLoading ? null : _submitWorker,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFD4F73C),
                foregroundColor: const Color(0xFF090B0A),
                disabledBackgroundColor: const Color(0xFFD4F73C).withOpacity(0.4),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isWorkerLoading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF090B0A)),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _isRegister ? 'Vytvořit účet' : 'Přihlásit se',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward, size: 16),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // 2. Karta pro vedení (Šéf - Marek Dubina)
  Widget _buildBossCard() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF121513),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.35)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF59E0B).withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Form(
        key: _bossFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Záhlaví karty šéfa
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2E2812),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
                  ),
                  child: const Icon(
                    Icons.shield,
                    color: Color(0xFFF59E0B),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Vedení firmy (Šéf)',
                      style: TextStyle(
                        color: Color(0xFFFCD34D),
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Správa zakázek a schvalování',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const Divider(color: Color(0xFF1E251E), height: 28),

            if (_bossError != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF2A1516),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFF5B65).withOpacity(0.4)),
                ),
                child: Text(
                  _bossError!,
                  style: const TextStyle(color: Color(0xFFFF5B65), fontSize: 12),
                ),
              ),
              const SizedBox(height: 14),
            ],

            const Text(
              'Jméno správce',
              style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _bossNameController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: _inputDecoration('Marek Dubina', Icons.badge_outlined),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Zadejte jméno správce';
                }
                return null;
              },
            ),
            const SizedBox(height: 14),

            const Text(
              'Heslo vedení *',
              style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _bossPasswordController,
              obscureText: !_isBossPasswordVisible,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: _inputDecoration('Heslo vedení', Icons.key_outlined).copyWith(
                suffixIcon: IconButton(
                  icon: Icon(
                    _isBossPasswordVisible ? Icons.visibility_off : Icons.visibility,
                    color: const Color(0xFF64748B),
                    size: 18,
                  ),
                  onPressed: () => setState(() => _isBossPasswordVisible = !_isBossPasswordVisible),
                ),
              ),
              validator: (val) {
                if (val == null || val.isEmpty) {
                  return 'Zadejte heslo vedení';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            FilledButton(
              onPressed: _isBossLoading ? null : _submitBoss,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFF59E0B),
                foregroundColor: const Color(0xFF090B0A),
                disabledBackgroundColor: const Color(0xFFF59E0B).withOpacity(0.4),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isBossLoading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF090B0A)),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shield, size: 16),
                        SizedBox(width: 8),
                        Text(
                          'Vstoupit do administrace',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 13),
      prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 18),
      filled: true,
      fillColor: const Color(0xFF0A0D0B),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF232A23)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFD4F73C), width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFFF5B65)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFFF5B65), width: 1.5),
      ),
    );
  }
}
