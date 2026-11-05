import { AppBuildInfo } from '../types/version';

export interface UpdateState {
  hasUpdate: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number; // 0 - 100
  downloadStage: string;
  latestVersion: AppBuildInfo | null;
  currentVersion: AppBuildInfo;
  lastChecked: Date | null;
  error: string | null;
}

const DEFAULT_BUILD_INFO: AppBuildInfo = {
  version: '1.0.1',
  buildNumber: 101,
  buildTime: new Date().toISOString(),
  releaseNotes: 'Stabilní verze aplikace Firemní Docházka.',
  minSupportedVersion: '1.0.0',
};

class UpdateService {
  private currentBuild: AppBuildInfo;
  private listeners: ((state: UpdateState) => void)[] = [];
  private swRegistration: ServiceWorkerRegistration | null = null;
  private checkIntervalTimer: any = null;

  private state: UpdateState;

  constructor() {
    this.currentBuild =
      typeof __APP_BUILD_INFO__ !== 'undefined'
        ? __APP_BUILD_INFO__
        : DEFAULT_BUILD_INFO;

    this.state = {
      hasUpdate: false,
      isChecking: false,
      isDownloading: false,
      downloadProgress: 0,
      downloadStage: '',
      latestVersion: null,
      currentVersion: this.currentBuild,
      lastChecked: null,
      error: null,
    };

    this.initServiceWorker();
    this.initAutoCheck();
  }

  getCurrentVersion(): AppBuildInfo {
    return this.currentBuild;
  }

  getState(): UpdateState {
    return { ...this.state };
  }

  subscribe(listener: (state: UpdateState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  // Registrace a sledování Service Workeru
  private async initServiceWorker() {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = reg;

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nový Service Worker je připraven
                this.state.hasUpdate = true;
                this.notify();
              }
            });
          }
        });
      } catch (err) {
        console.warn('Service Worker registration skipped or failed:', err);
      }
    }
  }

  // Automatické spuštění periodické kontroly aktualizací
  private initAutoCheck() {
    // Počkej 3 sekundy po startu a zkontroluj
    setTimeout(() => {
      this.checkForUpdates();
    }, 3000);

    // Kontrola každých 45 sekund
    this.checkIntervalTimer = setInterval(() => {
      this.checkForUpdates();
    }, 45000);

    // Kontrola při návratu uživatele do aplikace (focus / visibility)
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.checkForUpdates());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkForUpdates();
        }
      });
    }
  }

  // Ruční nebo automatická kontrola nového sestavení
  async checkForUpdates(): Promise<{ hasUpdate: boolean; latest?: AppBuildInfo }> {
    this.state.isChecking = true;
    this.state.error = null;
    this.notify();

    try {
      // 1. Zkontroluj Service Worker aktualizace
      if (this.swRegistration) {
        try {
          await this.swRegistration.update();
        } catch {
          // Ignoruj chybu sítě
        }
      }

      // 2. Načti aktuální version.json s cache-busting parametrem
      const cacheBuster = Date.now();
      const response = await fetch(`/version.json?_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Nelze ověřit verzi ze serveru');
      }

      const remoteInfo: AppBuildInfo = await response.json();
      this.state.lastChecked = new Date();

      // Porovnání verzí: kontrolujeme číslo sestavení i sémantickou verzi
      const isNewerBuild = remoteInfo.buildNumber > this.currentBuild.buildNumber;
      const isNewerVersion = remoteInfo.version !== this.currentBuild.version && isNewerBuild;

      if (isNewerBuild || isNewerVersion) {
        this.state.hasUpdate = true;
        this.state.latestVersion = remoteInfo;
      } else {
        this.state.hasUpdate = false;
        this.state.latestVersion = remoteInfo;
      }

      this.state.isChecking = false;
      this.notify();
      return { hasUpdate: this.state.hasUpdate, latest: remoteInfo };
    } catch (err: any) {
      this.state.isChecking = false;
      this.state.error = err.message || 'Chyba při zjišťování aktualizace';
      this.notify();
      return { hasUpdate: false };
    }
  }

  // Stažení aktualizace přímo v aplikaci a její okamžité nasazení
  async downloadAndInstallUpdate(
    onProgress?: (progress: number, stage: string) => void
  ): Promise<void> {
    if (this.state.isDownloading) return;

    this.state.isDownloading = true;
    this.state.downloadProgress = 5;
    this.state.downloadStage = 'Inicializace stahování...';
    this.notify();
    onProgress?.(5, this.state.downloadStage);

    try {
      // Krok 1: Stahování nových balíčků s progress bar animací
      for (let p = 10; p <= 65; p += 15) {
        await new Promise((r) => setTimeout(r, 180));
        this.state.downloadProgress = p;
        this.state.downloadStage = `Stahování nového sestavení aplikace (${p}%)...`;
        this.notify();
        onProgress?.(p, this.state.downloadStage);
      }

      // Krok 2: Uložení do mezipaměti / precaching
      this.state.downloadProgress = 80;
      this.state.downloadStage = 'Aktualizace mezipaměti a souborů...';
      this.notify();
      onProgress?.(80, this.state.downloadStage);
      await new Promise((r) => setTimeout(r, 220));

      // Krok 3: Vyčištění starých cache a aktivace nového service workeru
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {
          // Ignoruj
        }
      }

      if (this.swRegistration?.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      this.state.downloadProgress = 100;
      this.state.downloadStage = 'Aktualizace dokončena! Restartuji aplikaci...';
      this.notify();
      onProgress?.(100, this.state.downloadStage);

      // Krok 4: Restart aplikace na novou verzi
      await new Promise((r) => setTimeout(r, 400));
      window.location.reload();
    } catch (err: any) {
      this.state.isDownloading = false;
      this.state.error = 'Chyba při stahování aktualizace.';
      this.notify();
    }
  }

  cleanup() {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
    }
  }
}

export const updateService = new UpdateService();
