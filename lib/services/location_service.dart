import 'package:geolocator/geolocator.dart';

class LocationService {
  /// Získá aktuální GPS polohu zařízení.
  /// Pokud uživatel odmítne oprávnění nebo je GPS vypnuté, vrátí bezpečně null.
  static Future<Map<String, dynamic>?> getCurrentLocation({
    Duration timeout = const Duration(seconds: 6),
  }) async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return null;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: timeout,
        ),
      );

      return {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'timestamp': position.timestamp.toIso8601String(),
      };
    } catch (e) {
      // V případě jakéhokoliv selhání pokračujeme bez GPS záznamu
      return null;
    }
  }
}
