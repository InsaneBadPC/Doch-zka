import React, { useState } from 'react';
import { storageService, BOSS_NAME } from '../services/storage';
import { firebaseAuthService } from '../services/firebase';
import { ShareAppModal } from './common/ShareAppModal';
import {
  Clock,
  Shield,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Share2,
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  // Přepínač mezi přístupem pro zaměstnance a vedení (Marek Dubina)
  const [portalType, setPortalType] = useState<'worker' | 'boss'>('worker');

  // Zaměstnanec stavy
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(250);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Vedení (Šéf) stavy
  const [bossName, setBossName] = useState(BOSS_NAME);
  const [bossPassword, setBossPassword] = useState('');
  const [showBossPassword, setShowBossPassword] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const appUser = await firebaseAuthService.signInWithGoogle();
      storageService.setCurrentUser(appUser);
      const existing = storageService.getUsers().find((u) => u.id === appUser.id);
      if (!existing) {
        storageService.addUser(
          appUser.name,
          appUser.email,
          appUser.role,
          appUser.defaultHourlyRate,
          appUser.allowCustomRate
        );
      }
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError(
          'Doména insanebadpc.github.io zatím není povolena ve Firebase Console (Authentication > Settings > Authorized domains). Prozatím se prosím přihlaste níže e-mailem a heslem.'
        );
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Nepodařilo se přihlásit přes Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Zadejte platnou e-mailovou adresu zaměstnance.');
      return;
    }

    if (!password || password.length < 4) {
      setError('Heslo musí mít alespoň 4 znaky.');
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setError('Zadejte své celé jméno a příjmení.');
        return;
      }
      try {
        storageService.register(name, cleanEmail, 'worker', hourlyRate, password);
      } catch (err: any) {
        setError(err.message || 'Chyba při registraci.');
      }
    } else {
      try {
        const logged = storageService.login(cleanEmail, password);
        if (!logged) {
          setError('Zaměstnanec s tímto e-mailem nebyl nalezen. Zaregistrujte se prosím.');
        }
      } catch (err: any) {
        setError(err.message || 'Nesprávné přihlašovací údaje.');
      }
    }
  };

  const handleBossSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bossPassword) {
      setError('Zadejte heslo správce.');
      return;
    }

    try {
      storageService.loginBoss(bossPassword, bossName);
    } catch (err: any) {
      setError(err.message || 'Nesprávné heslo pro přístup správce.');
    }
  };

  return (
    <div className="min-h-screen bg-[#090B0A] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Decentní pozadí */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4F73C]/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Pouze název aplikace a ikona v záhlaví */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#D4F73C] text-[#090B0A] items-center justify-center font-black shadow-lg shadow-[#D4F73C]/20 mb-1">
            <Clock className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Docházka
          </h1>
        </div>

        {/* Hlavní autentizační karta */}
        <div className="bg-[#121513] border border-[#232A23] rounded-[28px] p-6 sm:p-8 shadow-2xl">
          {/* Přepínač: Zaměstnanec vs Vedení */}
          <div className="flex bg-[#0A0D0B] p-1.5 rounded-2xl border border-[#222922] mb-6 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setPortalType('worker');
                setError(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                portalType === 'worker'
                  ? 'bg-[#1C251C] text-[#D4F73C] border border-[#2B392B] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Zaměstnanec</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalType('boss');
                setError(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                portalType === 'boss'
                  ? 'bg-[#2E2812] text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Vedení (Šéf)</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-[#2A1516] border border-[#FF5B65]/40 text-[#FF5B65] text-xs font-medium">
              {error}
            </div>
          )}

          {/* Sekvence: Přihlášení / Registrace zaměstnance */}
          {portalType === 'worker' && (
            <div>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#1E251E]">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  {isRegister ? 'Registrace' : 'Přihlášení'}
                </span>

                <div className="flex bg-[#0A0D0B] p-1 rounded-xl border border-[#222922]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      !isRegister
                        ? 'bg-[#D4F73C] text-[#090B0A] shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Přihlásit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isRegister
                        ? 'bg-[#D4F73C] text-[#090B0A] shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Registrovat
                  </button>
                </div>
              </div>

              {/* Google přihlášení */}
              <div className="mb-5 space-y-3">
                <button
                  type="button"
                  disabled={isGoogleLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full min-h-[46px] py-2.5 px-4 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-extrabold rounded-2xl transition flex items-center justify-center gap-3 shadow-lg shadow-white/10 text-xs sm:text-sm group cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0 transition group-hover:scale-105" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {isGoogleLoading
                      ? 'Probíhá přihlašování...'
                      : 'Přihlásit se přes Google'}
                  </span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-[#1E251E]"></div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500">
                    nebo e-mailem a heslem
                  </span>
                  <div className="flex-1 border-t border-[#1E251E]"></div>
                </div>
              </div>

              {/* Zaměstnanecký formulář */}
              <form onSubmit={handleWorkerSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Jméno a příjmení *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jméno a příjmení"
                      className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    E-mailová adresa *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vas@email.cz"
                    className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm font-mono focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Heslo *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none transition pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Hodinová sazba (Kč/h)
                    </label>
                    <input
                      type="number"
                      value={hourlyRate}
                      min={50}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm font-mono focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-2 min-h-[48px] py-3 bg-[#D4F73C] hover:bg-[#c6eb2d] active:scale-[0.99] text-[#090B0A] font-extrabold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#D4F73C]/20 text-xs sm:text-sm cursor-pointer"
                >
                  <span>{isRegister ? 'Vytvořit účet' : 'Přihlásit se'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>
          )}

          {/* Sekvence: Vstup pro vedení (Šéf - Marek Dubina) */}
          {portalType === 'boss' && (
            <div>
              <div className="mb-5 pb-3 border-b border-[#1E251E]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                    Přístup vedení firmy
                  </span>
                </div>
              </div>

              <form onSubmit={handleBossSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Jméno správce
                  </label>
                  <input
                    type="text"
                    required
                    value={bossName}
                    onChange={(e) => setBossName(e.target.value)}
                    placeholder="Marek Dubina"
                    className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-amber-400 rounded-2xl text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Heslo *
                  </label>
                  <div className="relative">
                    <input
                      type={showBossPassword ? 'text' : 'password'}
                      required
                      value={bossPassword}
                      onChange={(e) => setBossPassword(e.target.value)}
                      placeholder="Heslo vedení"
                      className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-amber-400 rounded-2xl text-white text-sm focus:outline-none transition pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBossPassword(!showBossPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showBossPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 min-h-[48px] py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.99] text-slate-950 font-extrabold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-xs sm:text-sm cursor-pointer"
                >
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                  <span>Vstoupit do administrace</span>
                </button>
              </form>
            </div>
          )}

          {/* Spodní řádek: Zabezpečení a APK / sdílení */}
          <div className="mt-6 pt-4 border-t border-[#1E251E] flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#D4F73C]" /> Zabezpečeno
            </span>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="text-xs font-mono text-slate-400 hover:text-[#D4F73C] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Sdílet / Stáhnout APK
            </button>
          </div>
        </div>
      </div>

      {/* Modal pro sdílení */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
