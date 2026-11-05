import React, { useState } from 'react';
import { storageService } from '../services/storage';
import { Clock, Shield, User, ArrowRight, UserPlus, CheckCircle2 } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('insanebad2@gmail.com');
  const [password, setPassword] = useState('');
  const [hourlyRate, setHourlyRate] = useState(250);
  const [role, setRole] = useState<'worker' | 'admin'>('worker');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!name.trim()) {
        setError('Zadejte své jméno a příjmení.');
        return;
      }
      if (!email.includes('@')) {
        setError('Zadejte platnou e-mailovou adresu.');
        return;
      }
      try {
        storageService.register(name, email, role, hourlyRate);
      } catch (err: any) {
        setError(err.message || 'Chyba při registraci.');
      }
    } else {
      if (!email.trim()) {
        setError('Zadejte e-mail.');
        return;
      }
      const logged = storageService.login(email);
      if (!logged) {
        // Pokud ještě neexistuje v lokální databázi, automaticky ho vytvoříme jako reálného uživatele
        try {
          const autoRole = email.toLowerCase() === 'insanebad2@gmail.com' ? 'admin' : 'worker';
          storageService.register(
            email.split('@')[0],
            email,
            autoRole,
            autoRole === 'admin' ? 350 : 250
          );
        } catch {
          setError('Uživatel s tímto e-mailem nebyl nalezen.');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Firemní systém</div>
              <h1 className="text-xl font-bold text-white tracking-tight">Evidence docházky a zakázek</h1>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {isRegister
              ? 'Vytvoření nového uživatelského účtu'
              : 'Přihlášení do vašeho firemního účtu'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Jméno a příjmení</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="např. Tomáš Dvořák"
                className="w-full px-3.5 py-2.5 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">E-mailová adresa</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas.email@firma.cz"
              className="w-full px-3.5 py-2.5 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {isRegister && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role v aplikaci</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm focus:outline-none"
                >
                  <option value="worker">Pracovník</option>
                  <option value="admin">Administrátor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Hodinová sazba (Kč)</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#090d16] border border-slate-800 rounded-xl text-white text-sm font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
          >
            {isRegister ? 'Vytvořit účet' : 'Přihlásit se do docházky'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-slate-400 hover:text-amber-400 transition"
          >
            {isRegister ? 'Máte již účet? Přihlaste se zde' : 'Registrovat nového pracovníka nebo správce'}
          </button>
        </div>
      </div>
    </div>
  );
};
