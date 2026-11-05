// File generated for Dochazka App Firebase Configuration
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyANHMTYhDd--dtl_chbh-0EpFxPWV0PXzM',
    appId: '1:492326358514:web:ab62eec7c3ebfd5a85af6b',
    messagingSenderId: '492326358514',
    projectId: 'gen-lang-client-0423108659',
    authDomain: 'gen-lang-client-0423108659.firebaseapp.com',
    storageBucket: 'gen-lang-client-0423108659.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyANHMTYhDd--dtl_chbh-0EpFxPWV0PXzM',
    appId: '1:492326358514:android:dochazkaapp',
    messagingSenderId: '492326358514',
    projectId: 'gen-lang-client-0423108659',
    storageBucket: 'gen-lang-client-0423108659.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyANHMTYhDd--dtl_chbh-0EpFxPWV0PXzM',
    appId: '1:492326358514:ios:dochazkaapp',
    messagingSenderId: '492326358514',
    projectId: 'gen-lang-client-0423108659',
    storageBucket: 'gen-lang-client-0423108659.firebasestorage.app',
    iosBundleId: 'cz.dochazka.dochazkaApp',
  );
}
