/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoleRouter } from './components/RoleRouter';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] font-sans antialiased selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200">
      <RoleRouter />
    </div>
  );
}
