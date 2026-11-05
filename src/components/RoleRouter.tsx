import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { useTheme } from '../services/theme';
import { AppUser } from '../types';
import { AuthScreen } from './AuthScreen';
import { WorkerDashboard } from './worker/WorkerDashboard';
import { AdminDashboard } from './admin/AdminDashboard';
import { Lock, LogOut, Shield, User, Clock, Sun, Moon } from 'lucide-react';

export const RoleRouter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [viewRole, setViewRole] = useState<'admin' | 'worker'>('admin');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const sync = () => {
      const u = storageService.getCurrentUser();
      setCurrentUser(u);
      if (u) {
        setViewRole(u.role);
      }
    };
    sync();
    const unsub = storageService.subscribe(sync);
    return () => unsub();
  }, []);

  const handleLogout = () => {
    storageService.setCurrentUser(null);
  };

  // 1. Nepřihlášený uživatel
  if (!currentUser) {
    return <AuthScreen />;
  }

  // 2. Deaktivovaný účet (active == false)
  if (!currentUser.active) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#0f172a] border border-red-200 dark:border-red-900/60 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-200 dark:border-red-800/60">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Váš účet byl deaktivován správcem</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Nemáte povolen přístup do firemní docházky. Pro obnovení přístupu prosím kontaktujte svého nadřízeného.
          </p>
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Odhlásit se
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveRole = currentUser.role === 'admin' ? viewRole : 'worker';

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/90 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Zóna 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
            <Clock className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white uppercase font-sans">
              DOCHÁZKA
            </span>
            <span className="hidden sm:inline text-slate-400 text-xs ml-2 font-mono">
              / Evidence zakázek
            </span>
          </div>
        </div>

        {/* Zóna 2: Přepínač pohledu pro správce */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser.role === 'admin' ? (
            <div className="flex items-center bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setViewRole('admin')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  effectiveRole === 'admin'
                    ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Pohled: Administrátor</span>
              </button>
              <button
                onClick={() => setViewRole('worker')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  effectiveRole === 'worker'
                    ? 'bg-white dark:bg-amber-500 text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Pohled: Pracovník</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Pracovník ({currentUser.defaultHourlyRate} Kč/h)
            </div>
          )}
        </div>

        {/* Zóna 3: Přepínač motivu, profil a odhlášení */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Tlačítko přepnutí světlý / tmavý režim */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={theme === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="hidden md:block text-right">
            <div className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{currentUser.email}</div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Odhlásit se"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hlavní obsah */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 pb-20">
        {effectiveRole === 'admin' ? (
          <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
        ) : (
          <WorkerDashboard currentUser={currentUser} onLogout={handleLogout} />
        )}
      </main>
    </div>
  );
};
