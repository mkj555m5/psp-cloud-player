/**
 * إدارة عمليات تحميل الألعاب في الخلفية مع تتبع التقدم.
 * الحالة تُحفظ في الذاكرة (كافية لأن الخادم عملية طويلة الأمد على Railway).
 */

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

// تخزين الخريطة على globalThis لضمان مشاركتها بين كل وحدات API
// (يمنع انفصال الحالة عند إعادة تحميل الوحدات في التطوير)
const globalStore = globalThis as unknown as {
  __pspDownloads?: Map<string, DownloadProgress>;
};
const downloads = globalStore.__pspDownloads ?? new Map<string, DownloadProgress>();
globalStore.__pspDownloads = downloads;

export function createProgress(id: string, name: string): DownloadProgress {
  const entry: DownloadProgress = {
    id,
    name,
    status: "downloading",
    received: 0,
    total: 0,
    percent: 0,
    startedAt: Date.now(),
  };
  downloads.set(id, entry);
  return entry;
}

export function getProgress(id: string): DownloadProgress | undefined {
  return downloads.get(id);
}

export function listProgress(): DownloadProgress[] {
  return Array.from(downloads.values()).sort((a, b) => b.startedAt - a.startedAt);
}

export function updateProgress(
  id: string,
  patch: Partial<DownloadProgress>
): void {
  const entry = downloads.get(id);
  if (!entry) return;
  Object.assign(entry, patch);
  if (entry.total > 0) {
    entry.percent = Math.min(100, Math.round((entry.received / entry.total) * 100));
  }
}

export function finishProgress(id: string, gameId: string): void {
  updateProgress(id, { status: "done", percent: 100, gameId });
  // تنظيف تلقائي بعد ساعة
  setTimeout(() => {
    const entry = downloads.get(id);
    if (entry && (entry.status === "done" || entry.status === "error")) {
      downloads.delete(id);
    }
  }, 60 * 60 * 1000);
}

export function failProgress(id: string, message: string): void {
  updateProgress(id, { status: "error", error: message });
}
