import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Pomocná funkce pro automatické verzování sestavení
function getOrIncrementBuildVersion(isBuild: boolean) {
  const versionPath = path.resolve(__dirname, 'public/version.json');
  let data = {
    version: '1.0.1',
    buildNumber: 101,
    buildTime: new Date().toISOString(),
    releaseNotes: 'Automatické verzování a detekce aktualizací v aplikaci',
    minSupportedVersion: '1.0.0',
  };

  try {
    if (fs.existsSync(versionPath)) {
      const raw = fs.readFileSync(versionPath, 'utf-8');
      data = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read version.json, creating initial', err);
  }

  if (isBuild) {
    const ghRunNum = parseInt(process.env.GITHUB_RUN_NUMBER || '', 10);
    if (!isNaN(ghRunNum) && ghRunNum > 0) {
      data.buildNumber = 100 + ghRunNum;
      data.version = `1.0.${ghRunNum}`;
    } else {
      data.buildNumber += 1;
      const patch = data.buildNumber - 100;
      data.version = `1.0.${patch}`;
    }
    data.buildTime = new Date().toISOString();
    try {
      fs.writeFileSync(versionPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write updated version.json', err);
    }
  }

  return data;
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const buildInfo = getOrIncrementBuildVersion(isBuild);

  return {
    base: './',
    define: {
      __APP_BUILD_INFO__: JSON.stringify(buildInfo),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
