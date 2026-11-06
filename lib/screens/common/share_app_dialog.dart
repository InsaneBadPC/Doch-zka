import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class ShareAppDialog extends StatelessWidget {
  const ShareAppDialog({super.key});

  static const String webAppUrl = 'https://insanebadpc.github.io/Doch-zka';
  static const String apkDownloadUrl =
      'https://github.com/InsaneBadPC/Doch-zka/releases/latest/download/app-release.apk';

  Future<void> _copy(BuildContext context, String text, String label) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$label zkopírován do schránky.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF121513),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: Color(0xFF232A23)),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFD4F73C),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.share, color: Color(0xFF090B0A), size: 18),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sdílet aplikaci Docházka',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                ),
                Text(
                  'Odkazy pro zaměstnance a kolegy',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildShareCard(
              context,
              icon: Icons.language,
              title: 'WEBOVÁ APLIKACE (PC, iPhone & Android)',
              subtitle: 'Funguje v libovolném prohlížeči bez instalace.',
              url: webAppUrl,
              buttonLabel: 'Kopírovat odkaz na Web',
            ),
            const SizedBox(height: 12),
            _buildShareCard(
              context,
              icon: Icons.phone_android,
              title: 'ANDROID APLIKACE (.APK INSTALÁTOR)',
              subtitle: 'Přímý odkaz na stažení nejnovějšího APK z GitHub Releases.',
              url: apkDownloadUrl,
              buttonLabel: 'Kopírovat odkaz na APK',
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Zavřít', style: TextStyle(color: Color(0xFFD4F73C), fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildShareCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required String url,
    required String buttonLabel,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0D0B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF232A23)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFFD4F73C)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF121513),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF232A23)),
            ),
            child: Text(
              url,
              style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontFamily: 'monospace'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => _copy(context, url, buttonLabel),
              icon: const Icon(Icons.copy, size: 15),
              label: Text(buttonLabel, style: const TextStyle(fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
