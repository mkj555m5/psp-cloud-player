/** أنواع البيانات المشتركة بين الواجهة والخادم */

export interface GameRecord {
  id: string;
  name: string;
  ext: string;
  size: number;
  createdAt: string;
}

export type DownloadStatus =
  | "downloading"
  | "extracting"
  | "saving"
  | "done"
  | "error";

export interface DownloadProgress {
  id: string;
  name: string;
  status: DownloadStatus;
  received: number;
  total: number;
  percent: number;
  error?: string;
  gameId?: string;
  startedAt: number;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export function statusLabel(status: DownloadStatus): string {
  switch (status) {
    case "downloading":
      return "جاري التحميل";
    case "extracting":
      return "جاري فك الضغط";
    case "saving":
      return "جاري الحفظ";
    case "done":
      return "اكتمل";
    case "error":
      return "فشل";
  }
}

/** الصيغ المدعومة لمحاكي PPSSPP */
export const SUPPORTED_EXTS = ["iso", "cso", "pbp", "chd"];
