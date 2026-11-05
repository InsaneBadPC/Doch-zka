import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { useTheme } from '../services/theme';
import { AppUser } from '../types';
import { AuthScreen } from './AuthScreen';
import { WorkerDashboard } from './worker/WorkerDashboard';
import { AdminDashboard } from './admin/AdminDashboard';
import { ShareAppModal } from './common/ShareAppModal';
import { CheckForUpdatesButton } from './common/UpdateNotification';
import {
  Lock,
  LogOut,
  Shield,
  User,
  Clock,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Share2,
} from 'lucide-react';

export const RoleRouter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [viewRole, setViewRole] = useState<'admin' | 'worker'>('admin');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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
      <div className="min-h-screen bg-[#090B0A] text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-[#121513] border border-[#FF5B65]/40 rounded-[30px] p-8 text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#2A1516] text-[#FF5B65] mx-auto flex items-center justify-center border border-[#FF5B65]/40">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Váš firemní účet byl pozastaven</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nemáte povolen přístup do evidence docházky. Pro obnovení přístupu prosím kontaktujte vedení firmy na e-mailu správce.
          </p>
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-[#1A221A] hover:bg-[#253225] text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 border border-[#2B392B]"
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
    <div className="min-h-screen bg-[#090B0A] text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Header ve stylu fintech Dribbble aplikace - optimalizováno pro mobily i desktop */}
      <header className="sticky top-0 z-40 bg-[#090B0A]/95 backdrop-blur-xl border-b border-[#1E251E] px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zóna 1: Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#D4F73C] text-[#090B0A] flex items-center justify-center font-black shadow-md shadow-[#D4F73C]/20 shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase font-sans">
                DOCHÁZKA
              </span>
              <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1C251C] text-[#D4F73C] border border-[#2B392B]">
                PRO
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono hidden md:block">
              Evidence zakázek · Spark 0 Kč
            </div>
          </div>
        </div>

        {/* Zóna 2: Přepínač pohledu pro správce (Admin / Pracovník) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {currentUser.role === 'admin' ? (
            <div className="flex items-center bg-[#121513] border border-[#232A23] rounded-2xl p-0.5 sm:p-1 text-xs">
              <button
                onClick={() => setViewRole('admin')}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs ${
                  effectiveRole === 'admin'
                    ? 'bg-[#D4F73C] text-[#090B0A] shadow-md shadow-[#D4F73C]/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden md:inline">Pohled: Administrátor</span>
                <span className="md:hidden">Šéf</span>
              </button>
              <button
                onClick={() => setViewRole('worker')}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs ${
                  effectiveRole === 'worker'
                    ? 'bg-[#D4F73C] text-[#090B0A] shadow-md shadow-[#D4F73C]/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden md:inline">Pohled: Pracovník</span>
                <span className="md:hidden">Pracovník</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono px-2.5 py-1 bg-[#121513] rounded-xl border border-[#232A23]">
              Pracovník <strong className="text-[#D4F73C]">({currentUser.defaultHourlyRate} Kč/h)</strong>
            </div>
          )}
        </div>

        {/* Zóna 3: Sdílení, Profil a Odhlášení */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <CheckForUpdatesButton compact={true} />

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1C251C] hover:bg-[#D4F73C] text-[#D4F73C] hover:text-black border border-[#2B392B] text-xs font-bold transition flex items-center gap-1.5"
            title="Sdílet odkaz na aplikaci a APK"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Sdílet app</span>
          </button>

          <div className="hidden lg:flex items-center gap-2.5 bg-[#121513] border border-[#232A23] rounded-2xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-xl bg-[#1C251C] border border-[#2B392B] text-[#D4F73C] font-mono font-bold flex items-center justify-center text-xs">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-white">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{currentUser.email}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white bg-[#121513] hover:bg-[#1A221A] border border-[#232A23] transition"
            title="Odhlásit se"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hlavní obsah s fluidním paddingem pro mobily a desktop */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
        {effectiveRole === 'admin' ? (
          <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
        ) : (
          <WorkerDashboard currentUser={currentUser} onLogout={handleLogout} />
        )}
      </main>

      {/* Modal pro sdílení aplikace a APK */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
