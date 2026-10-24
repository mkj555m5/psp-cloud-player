# ============================================================
#  PSP Cloud Player — مراحل بناء Docker جاهزة لـ Railway
# ============================================================

# ----- المرحلة 1: البناء -----
FROM oven/bun:1 AS builder
WORKDIR /app

# تثبيت الاعتمادات (مع الاستفادة من الكاش)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# نسخ الكود وبناء المشروع
COPY . .
RUN bunx prisma generate && bun run build

# ----- المرحلة 2: التشغيل -----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# نسخة standalone الجاهزة (تتضمن الخادم + الاعتمادات اللازمة فقط)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# مجلد التخزين الافتراضي (يُستبدل بـ Volume عند توفره)
RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "server.js"]
