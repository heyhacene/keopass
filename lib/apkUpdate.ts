export interface LatestApkRelease {
  version: string;
  buildNumber: number | null;
  filename: string;
  downloadUrl: string;
  sizeBytes: number;
}

export const DEFAULT_KEOPASS_BUILD = process.env.NEXT_PUBLIC_BUILD_NUMBER || '28';

export function getDirectKeoPassApkUrl(buildNumber: string = DEFAULT_KEOPASS_BUILD): string {
  return `https://github.com/heyhacene/keopass/releases/download/v1.0.0-build.${buildNumber}/KeoPass-Build-${buildNumber}.apk`;
}

export function getDirectKeoPassApkFilename(buildNumber: string = DEFAULT_KEOPASS_BUILD): string {
  return `KeoPass-Build-${buildNumber}.apk`;
}

export async function fetchLatestKeoPassApk(): Promise<LatestApkRelease> {
  const fallbackRelease: LatestApkRelease = {
    version: `v1.0.0-build.${DEFAULT_KEOPASS_BUILD}`,
    buildNumber: parseInt(DEFAULT_KEOPASS_BUILD, 10),
    filename: getDirectKeoPassApkFilename(),
    downloadUrl: getDirectKeoPassApkUrl(),
    sizeBytes: 0,
  };

  try {
    const res = await fetch('https://api.github.com/repos/heyhacene/keopass/releases/latest', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) return fallbackRelease;
    const data = await res.json();
    if (!data || !Array.isArray(data.assets)) return fallbackRelease;

    // Priorité absolue au fichier nommé KeoPass-Build-XX.apk
    const buildAsset = data.assets.find(
      (a: any) => typeof a.name === 'string' && a.name.startsWith('KeoPass-Build-') && a.name.endsWith('.apk')
    );

    const asset = buildAsset || data.assets.find(
      (a: any) => typeof a.name === 'string' && a.name.endsWith('.apk')
    );

    if (!asset) return fallbackRelease;

    const buildMatch = asset.name.match(/Build-(\d+)/i) || data.tag_name?.match(/build\.(\d+)/i);
    const buildNum = buildMatch ? parseInt(buildMatch[1], 10) : parseInt(DEFAULT_KEOPASS_BUILD, 10);

    return {
      version: data.tag_name || `v1.0.0-build.${buildNum}`,
      buildNumber: buildNum,
      filename: asset.name,
      downloadUrl: asset.browser_download_url,
      sizeBytes: asset.size || 0,
    };
  } catch (err) {
    return fallbackRelease;
  }
}
