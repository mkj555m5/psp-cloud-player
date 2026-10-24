"use client";

import type { GameRecord } from "@/lib/types";
import { formatBytes, SUPPORTED_EXTS } from "@/lib/types";
import { Play, Gamepad2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  games: GameRecord[] | null;
  onPlay: (id: string) => void;
  onAdd: () => void;
}

export default function LibraryView({ games, onPlay, onAdd }: Props) {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* القسم الترحيبي */}
      <section className="relative overflow-hidden rounded-2xl border bg-card/60 p-8 md:p-12 mb-10">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 80% 20%, oklch(0.65 0.22 295 / 35%), transparent), radial-gradient(ellipse 50% 70% at 15% 90%, oklch(0.75 0.15 85 / 15%), transparent)",
          }}
        />
        <div className="relative">
          <Badge variant="outline" className="mb-4 border-primary/40 text-primary-foreground/90 bg-primary/10">
            محاكي PPSSPP في المتصفح
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black leading-tight mb-3">
            مكتبتك <span className="text-primary hero-glow">السحابية</span> لألعاب PSP
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base md:text-lg leading-relaxed">
            أضف رابط تحميل مباشر للعبة بصيغة ISO أو CSO أو PBP أو CHD، وسيقوم الخادم
            بتنزيلها وتخزينها سحابياً. بعد ذلك شغّلها من أي جهاز مباشرة في المتصفح —
            من دون تحميل على جهازك، مع حفظ حالات اللعب والتحكم الكامل.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Button size="lg" onClick={onAdd} className="gap-2 shadow-lg shadow-primary/25">
              <Plus className="size-5" />
              إضافة لعبة جديدة
            </Button>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_EXTS.map((ext) => (
                <Badge key={ext} variant="secondary" className="uppercase font-mono">
                  {ext}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* شبكة الألعاب */}
      <section aria-label="قائمة الألعاب">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Gamepad2 className="size-6 text-primary" />
            قائمة الألعاب
          </h2>
          {games && (
            <span className="text-sm text-muted-foreground">
              {games.length} لعبة
            </span>
          )}
        </div>

        {games === null ? (
          <GamesGridSkeleton />
        ) : games.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {games.map((game) => (
              <GameCard key={game.id} game={game} onPlay={onPlay} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GameCard({ game, onPlay }: { game: GameRecord; onPlay: (id: string) => void }) {
  return (
    <article className="game-card group relative rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => onPlay(game.id)}
        className="block w-full text-start cursor-pointer"
        aria-label={`فتح إعدادات لعبة ${game.name}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <img
            src={`/api/games/${game.id}/cover`}
            alt={`غلاف لعبة ${game.name}`}
            loading="lazy"
            className="cover-img absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <Badge className="absolute top-2 start-2 uppercase font-mono bg-black/60 backdrop-blur border border-white/10">
            {game.ext}
          </Badge>
          <div className="absolute bottom-0 inset-x-0 p-3">
            <h3 className="font-bold text-sm md:text-base line-clamp-2 text-white drop-shadow">
              {game.name}
            </h3>
          </div>
          {/* زر التشغيل عند التحويم */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            <span className="rounded-full bg-primary text-primary-foreground p-4 shadow-xl">
              <Play className="size-6 fill-current" />
            </span>
          </div>
        </div>
      </button>
      <div className="p-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground" dir="ltr">
          {formatBytes(game.size)}
        </span>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onPlay(game.id)}
        >
          <Play className="size-3.5" />
          إعدادات ولعب
        </Button>
      </div>
    </article>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed p-10 md:p-16 text-center">
      <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
        <Gamepad2 className="size-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">لا توجد ألعاب في المكتبة بعد</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
        ابدأ بإضافة رابط تحميل مباشر لأي لعبة PSP بصيغة ISO/CSO/PBP/CHD أو ملف
        ZIP يحتويها. سيتم تنزيلها إلى التخزين السحابي وظهورها هنا تلقائياً.
      </p>
      <Button size="lg" onClick={onAdd} className="gap-2">
        <Plus className="size-5" />
        أضف أول لعبة
      </Button>
    </div>
  );
}

function GamesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <Skeleton className="aspect-[3/4] rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
