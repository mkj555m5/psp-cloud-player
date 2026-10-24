import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import extract from "extract-zip";
import { db, withSchema } from "@/lib/db";
import {
  GAMES_DIR,
  COVERS_DIR,
  TMP_DIR,
  MAX_GAME_SIZE_GB,
  GAME_EXTS,
  ARCHIVE_EXTS,
  ensureDirs,
  getGamePath,
  getCoverPath,
  extFromUrl,
  fileNameFromUrl,
  contentTypeFromExt,
} from "@/lib/storage";
import {
  createProgress,
  updateProgress,
  finishProgress,
  failProgress,
} from "@/lib/downloads";

const MAX_BYTES = MAX_GAME_SIZE_GB * 1024 * 1024 * 1024;

interface StartOptions {
  downloadId: string;
  gameId: string;
  url: string;
  name?: string | null;
  imageUrl?: string | null;
}

/** يبدأ تحميل اللعبة في الخلفية بدون إيقاف الاستجابة */
export function startGameDownload(opts: StartOptions) {
  processDownload(opts).catch((err) => {
    failProgress(opts.downloadId, err?.message || "خطأ غير متوقع أثناء التحميل");
  });
}

async function processDownload(opts: StartOptions) {
  const { downloadId, gameId, url } = opts;
  const tmpFile = path.join(TMP_DIR, `${downloadId}.bin`);
  let extractDir = path.join(TMP_DIR, `${downloadId}_x`);

  try {
    await ensureDirs();
    createProgress(downloadId, opts.name || fileNameFromUrl(url) || "لعبة جديدة");

    // جلب الملف من الرابط المباشر
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "*/*",
      },
    });

    if (!res.ok || !res.body) {
      throw new Error(`فشل الوصول إلى الملف (رمز HTTP: ${res.status})`);
    }

    const total = parseInt(res.headers.get("content-length") || "0", 10) || 0;
    updateProgress(downloadId, { total });

    // تنزيل تدفقي مع تتبع التقدم
    let received = 0;
    const source = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
    source.on("data", (chunk: Buffer) => {
      received += chunk.length;
      updateProgress(downloadId, { received });
      if (received > MAX_BYTES) {
        source.destroy(new Error(`حجم اللعبة يتجاوز الحد المسموح (${MAX_GAME_SIZE_GB}GB). يمكن رفع الحد عبر MAX_GAME_SIZE_GB`));
      }
    });
    await pipeline(source, fs.createWriteStream(tmpFile));

    // تحديد الامتداد
    let ext = extFromUrl(url);
    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    if (ctype.includes("zip")) ext = "zip";
    if (ctype.includes("x-iso9660")) ext = ext || "iso";

    if (!ext || (!GAME_EXTS.includes(ext) && !ARCHIVE_EXTS.includes(ext))) {
      throw new Error(
        `صيغة الملف (${ext || "غير معروفة"}) غير مدعومة. المدعوم: ${GAME_EXTS.join(", ")} أو ZIP`
      );
    }

    let finalFile = tmpFile;
    let finalExt = ext;

    // فك ضغط ZIP إذا لزم الأمر
    if (ARCHIVE_EXTS.includes(ext)) {
      updateProgress(downloadId, { status: "extracting", percent: 0, total: 0, received: 0 });
      await extract(tmpFile, { dir: extractDir });

      // البحث عن أكبر ملف لعبة داخل الأرشيف
      const candidates: { file: string; size: number }[] = [];
      const walk = async (dir: string) => {
        for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else {
            const e = path.extname(entry.name).slice(1).toLowerCase();
            if (GAME_EXTS.includes(e)) {
              const st = await fsp.stat(full);
              candidates.push({ file: full, size: st.size });
            }
          }
        }
      };
      await walk(extractDir);

      if (!candidates.length) {
        throw new Error("لم يُعثر على ملف لعبة (iso/cso/pbp/chd) داخل ملف ZIP");
      }
      candidates.sort((a, b) => b.size - a.size);
      finalFile = candidates[0].file;
      finalExt = path.extname(finalFile).slice(1).toLowerCase();
    }

    // نقل الملف إلى مجلد الألعاب
    updateProgress(downloadId, { status: "saving" });
    const fileName = `${gameId}.${finalExt}`;
    const destPath = getGamePath(fileName);
    await fsp.rename(finalFile, destPath).catch(async () => {
      // قد يفشل rename بين أنظمة الملفات المختلفة
      await fsp.copyFile(finalFile, destPath);
      await fsp.rm(finalFile, { force: true });
    });

    const stat = await fsp.stat(destPath);

    // تحميل صورة الغلاف إن وُجدت
    let coverPath: string | null = null;
    if (opts.imageUrl) {
      try {
        coverPath = await downloadCover(gameId, opts.imageUrl);
      } catch {
        coverPath = null; // الغلاف اختياري - سيتم توليد صورة افتراضية
      }
    }

    const displayName =
      opts.name?.trim() ||
      path
        .basename(finalFile)
        .replace(/\.[^.]+$/, "")
        .replace(/[._-]+/g, " ")
        .trim() ||
      "لعبة PSP";

    await withSchema(() =>
      db.game.create({
        data: {
          id: gameId,
          name: displayName,
          fileName,
          ext: finalExt,
          size: stat.size,
          coverPath,
        },
      })
    );

    // تنظيف الملفات المؤقتة
    await fsp.rm(tmpFile, { force: true });
    await fsp.rm(extractDir, { recursive: true, force: true }).catch(() => {});

    updateProgress(downloadId, { received: stat.size, total: stat.size });
    finishProgress(downloadId, gameId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع أثناء التحميل";
    failProgress(downloadId, message);
    await fsp.rm(tmpFile, { force: true }).catch(() => {});
    await fsp.rm(extractDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function downloadCover(gameId: string, imageUrl: string): Promise<string | null> {
  const res = await fetch(imageUrl, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error("فشل تحميل الغلاف");

  const extMatch = extFromUrl(imageUrl);
  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  let ext =
    extMatch && ["jpg", "jpeg", "png", "webp", "gif"].includes(extMatch)
      ? extMatch === "jpeg"
        ? "jpg"
        : extMatch
      : ctype.includes("png")
        ? "png"
        : ctype.includes("webp")
          ? "webp"
          : ctype.includes("gif")
            ? "gif"
            : "jpg";

  const fileName = `${gameId}.${ext}`;
  const dest = getCoverPath(fileName);
  const source = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(source, fs.createWriteStream(dest));

  // التحقق أن الصورة غير فارغة
  const stat = await fsp.stat(dest);
  if (stat.size < 1024) {
    await fsp.rm(dest, { force: true });
    return null;
  }
  return fileName;
}
