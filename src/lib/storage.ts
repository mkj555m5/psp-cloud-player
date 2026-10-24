import path from "path";
import fs from "fs/promises";

/**
 * مجلد التخزين الرئيسي:
 * - على Railway: يُفضّل ربط Volume وتعيين DATA_DIR=/data
 * - محلياً: مجلد data داخل المشروع
 */
export const DATA_DIR =
  process.env.DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(process.cwd(), "data");

export const GAMES_DIR = path.join(DATA_DIR, "games");
export const COVERS_DIR = path.join(DATA_DIR, "covers");
export const TMP_DIR = path.join(DATA_DIR, "tmp");

/** أقصى حجم مسموح للعبة (بالكيلوبايت) - قابل للتعديل عبر متغير البيئة */
export const MAX_GAME_SIZE_GB = Math.max(
  0.1,
  parseFloat(process.env.MAX_GAME_SIZE_GB || "4")
);

/** الامتدادات المدعومة لمحاكي PPSSPP */
export const GAME_EXTS = ["iso", "cso", "pbp", "chd", "bin", "img"];
export const ARCHIVE_EXTS = ["zip"];

export async function ensureDirs() {
  await Promise.all(
    [GAMES_DIR, COVERS_DIR, TMP_DIR].map((dir) =>
      fs.mkdir(dir, { recursive: true })
    )
  );
}

export function getGamePath(fileName: string) {
  // منع أي محاولة للخروج من مجلد الألعاب
  const safe = path.basename(fileName);
  return path.join(GAMES_DIR, safe);
}

export function getCoverPath(fileName: string) {
  const safe = path.basename(fileName);
  return path.join(COVERS_DIR, safe);
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export function extFromUrl(url: string): string | null {
  try {
    const clean = url.split("#")[0].split("?")[0];
    const match = clean.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function fileNameFromUrl(url: string): string | null {
  try {
    const clean = decodeURIComponent(url.split("#")[0].split("?")[0]);
    const parts = clean.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  } catch {
    return null;
  }
}

export function contentTypeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  return map[ext] || "application/octet-stream";
}
