import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * ضمان وجود مخطط قاعدة البيانات عند أول استخدام.
 * ضروري لنشر Railway بقاعدة SQLite جديدة (مجلد Volume فارغ عند أول إقلاع) —
 * يطابق تماماً ما يولده `prisma db push` من DDL.
 */
const globalSchema = globalThis as unknown as {
  __pspSchemaReady?: Promise<void>
}

export function ensureSchema(): Promise<void> {
  if (!globalSchema.__pspSchemaReady) {
    globalSchema.__pspSchemaReady = (async () => {
      await db.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "Game" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "fileName" TEXT NOT NULL,
          "ext" TEXT NOT NULL,
          "size" REAL NOT NULL DEFAULT 0,
          "coverPath" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
      )
      await db.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "Game_fileName_key" ON "Game"("fileName")`
      )
    })().catch((err) => {
      // السماح بإعادة المحاولة عند فشل أولي (مثلاً مجلد البيانات لم يُنشأ بعد)
      globalSchema.__pspSchemaReady = undefined
      throw err
    })
  }
  return globalSchema.__pspSchemaReady
}

/**
 * يغلف أي عملية قاعدة بيانات: يضمن المخطط أولاً،
 * وإذا فُقد الجدول في منتصف التشغيل (مثلاً حُذف ملف الـ DB) يعيد
 * إنشاءه مرة واحدة ويعيد تنفيذ العملية — سلوك ذاتي الإصلاح.
 */
export async function withSchema<T>(fn: () => Promise<T>): Promise<T> {
  await ensureSchema()
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("does not exist")) {
      globalSchema.__pspSchemaReady = undefined
      await ensureSchema()
      return await fn()
    }
    throw err
  }
}
