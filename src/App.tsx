/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { RoleRouter } from './components/RoleRouter';
import { firestoreSyncService, testFirestoreConnection } from './services/firestoreService';
import { UpdateNotification } from './components/common/UpdateNotification';

export default function App() {
  useEffect(() => {
    testFirestoreConnection();
    firestoreSyncService.initRealtimeSync();

    return () => {
      firestoreSyncService.cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] font-sans antialiased selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200">
      <RoleRouter />
      <UpdateNotification />
    </div>
  );
}
