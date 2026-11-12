import React, { useState } from 'react';
import { Briefcase, X, Plus } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, client: string, budget: number) => void;
  isWorker?: boolean;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isWorker = false,
}) => {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [budget, setBudget] = useState(80000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalClient = client.trim() ? client.trim() : (isWorker ? 'Klient / Provoz' : 'Firemní zakázka');
    const finalBudget = budget > 0 ? budget : 80000;
    onSubmit(name.trim(), finalClient, finalBudget);
    setName('');
    setClient('');
    setBudget(80000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#121513] border border-[#232A23] rounded-[30px] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#D4F73C]" />
            <span>Založit novou zakázku</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Název zakázky *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Výstavba haly B, Rekonstrukce bytu..."
              className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isWorker ? 'Zákazník / Místo zakázky' : 'Zákazník / Firma *'}
            </label>
            <input
              type="text"
              required={!isWorker}
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder={isWorker ? 'např. Jan Novák / Brno (nepovinné)' : 'např. StavTech s.r.o.'}
              className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Předpokládaný mzdový rozpočet (Kč)
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full px-4 py-3 bg-[#0A0D0B] border border-[#232A23] focus:border-[#D4F73C] rounded-2xl text-white text-sm font-mono focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E251E]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#D4F73C] hover:bg-[#c4e92a] text-[#090B0A] font-extrabold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-[#D4F73C]/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Vytvořit zakázku</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
