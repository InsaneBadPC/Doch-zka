export interface AppBuildInfo {
  version: string;
  buildNumber: number;
  buildTime: string;
  releaseNotes?: string;
  minSupportedVersion?: string;
}

declare global {
  const __APP_BUILD_INFO__: AppBuildInfo;
}
