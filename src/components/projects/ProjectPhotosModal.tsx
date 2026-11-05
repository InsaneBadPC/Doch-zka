import React, { useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Trash2,
  Maximize2,
  Calendar,
  User,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AppUser, Project, ProjectPhoto } from '../../types';
import { storageService } from '../../services/storage';

interface ProjectPhotosModalProps {
  project: Project;
  currentUser: AppUser;
  onClose: () => void;
}

export const ProjectPhotosModal: React.FC<ProjectPhotosModalProps> = ({
  project,
  currentUser,
  onClose,
}) => {
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<ProjectPhoto | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPhotos = () => {
    const list = storageService.getProjectPhotos(project.id);
    setPhotos(list);
  };

  useEffect(() => {
    loadPhotos();
    const unsub = storageService.subscribe(loadPhotos);
    return () => unsub();
  }, [project.id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vyberte platný obrázek (JPEG, PNG apod.)');
      return;
    }

    try {
      setIsCompressing(true);
      setSelectedFile(file);
      // Generate client-side compressed preview
      const compressedDataUri = await storageService.compressImage(file, 800, 0.7);
      setPreviewUrl(compressedDataUri);
    } catch {
      setErrorMessage('Chyba při zpracování fotografie.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl) {
      setErrorMessage('Nejprve vyberte nebo vyfoťte snímek.');
      return;
    }

    try {
      setIsCompressing(true);
      storageService.addProjectPhoto({
        projectId: project.id,
        userId: currentUser.id,
        userName: currentUser.name,
        photoData: previewUrl,
        caption: caption.trim(),
      });

      // Reset form
      setPreviewUrl(null);
      setSelectedFile(null);
      setCaption('');
      setErrorMessage('');
    } catch {
      setErrorMessage('Nepodařilo se uložit fotografii.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDelete = (photoId: string) => {
    if (confirm('Opravdu chcete tuto fotografii smazat?')) {
      storageService.deleteProjectPhoto(photoId);
    }
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121513] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-[#171A18]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4F73C]/10 border border-[#D4F73C]/20 flex items-center justify-center text-[#D4F73C]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Fotodokumentace: {project.name}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
                  {photos.length} fotek
                </span>
              </div>
              <p className="text-xs text-white/50">{project.client}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Upload Section */}
          <div className="bg-[#171A18] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#D4F73C]" />
                Přidat novou fotografii ze stavby / zakázky
              </span>
              <span className="text-[11px] text-[#D4F73C]/80">
                Automatická optimalizace pro nulový tarif
              </span>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* File input / camera */}
                <div>
                  <label
                    htmlFor="project-photo-input"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-white/15 hover:border-[#D4F73C]/50 rounded-xl p-4 cursor-pointer bg-[#121513] transition-colors group text-center min-h-[110px]"
                  >
                    {isCompressing ? (
                      <div className="flex flex-col items-center gap-2 text-[#D4F73C]">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-medium">Optimalizuji snímek...</span>
                      </div>
                    ) : previewUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={previewUrl}
                          alt="Náhled"
                          className="w-16 h-16 object-cover rounded-lg border border-white/10"
                        />
                        <div className="text-left text-xs">
                          <p className="text-white font-medium truncate max-w-[150px]">
                            {selectedFile?.name}
                          </p>
                          <p className="text-[#D4F73C] text-[11px]">Klikněte pro změnu</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-white/40 group-hover:text-[#D4F73C] transition-colors mb-1" />
                        <span className="text-xs text-white/80 font-medium">
                          Vybrat soubor nebo vyfotit
                        </span>
                        <span className="text-[10px] text-white/40 mt-0.5">
                          Podporuje JPEG, PNG (zmenší se na cca 30 KB)
                        </span>
                      </>
                    )}
                    <input
                      id="project-photo-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Caption and Submit */}
                <div className="flex flex-col justify-between space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">
                      Popisek snímku (volitelné)
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Např. dokončení hrubých rozvodů, závada..."
                      className="w-full bg-[#121513] text-white placeholder-white/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#D4F73C]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!previewUrl || isCompressing}
                    className="w-full py-2.5 px-4 bg-[#D4F73C] text-black font-semibold text-xs rounded-xl hover:bg-[#c2e232] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(212,247,60,0.2)]"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Nahrát fotografii</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Photo Gallery Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Galerie snímků ({photos.length})
              </span>
            </div>

            {photos.length === 0 ? (
              <div className="py-16 text-center text-white/40 space-y-2 border border-white/5 rounded-2xl bg-[#171A18]/30">
                <ImageIcon className="w-10 h-10 mx-auto text-white/20" />
                <p className="text-xs">Zatím nebyly nahrány žádné fotografie k této zakázce.</p>
                <p className="text-[11px] text-white/30">
                  Pracovníci i šéf mohou kdykoliv pořizovat snímky průběhu prací.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((item) => {
                  const canDelete = isAdmin || item.userId === currentUser.id;
                  const dateStr = new Date(item.createdAt).toLocaleDateString('cs-CZ', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={item.id}
                      className="group bg-[#171A18] border border-white/5 hover:border-white/20 rounded-xl overflow-hidden transition-all flex flex-col justify-between"
                    >
                      {/* Photo Thumbnail */}
                      <div
                        className="relative aspect-video bg-black/40 cursor-pointer overflow-hidden"
                        onClick={() => setActiveLightbox(item)}
                      >
                        <img
                          src={item.photoData}
                          alt={item.caption || 'Fotka ze zakázky'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="p-2 bg-black/60 rounded-lg text-white">
                            <Maximize2 className="w-4 h-4" />
                          </span>
                        </div>
                      </div>

                      {/* Info & Caption */}
                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        {item.caption ? (
                          <p className="text-xs text-white font-medium line-clamp-2">
                            {item.caption}
                          </p>
                        ) : (
                          <p className="text-xs text-white/40 italic">Bez popisku</p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-white/50 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3 h-3 text-[#D4F73C]" />
                            <span className="truncate">{item.userName}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span>{dateStr}</span>
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-white/30 hover:text-red-400 p-1 transition-colors"
                                title="Smazat fotku"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-end bg-[#171A18]/50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Zavřít galerii
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setActiveLightbox(null)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveLightbox(null)}
              className="absolute -top-12 right-0 text-white/60 hover:text-white p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeLightbox.photoData}
              alt={activeLightbox.caption}
              className="max-w-full max-h-[75vh] object-contain rounded-xl border border-white/10"
            />
            {activeLightbox.caption && (
              <div className="mt-3 text-center text-sm font-medium text-white bg-black/60 px-4 py-2 rounded-xl border border-white/10">
                {activeLightbox.caption}
              </div>
            )}
            <div className="mt-2 text-xs text-white/50 flex items-center gap-3">
              <span>Autor: {activeLightbox.userName}</span>
              <span>•</span>
              <span>{new Date(activeLightbox.createdAt).toLocaleString('cs-CZ')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
