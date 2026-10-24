"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameRecord } from "@/lib/types";
import LibraryView from "@/components/library-view";
import AdminView from "@/components/admin-view";
import PlayView from "@/components/play-view";
import { Button } from "@/components/ui/button";
import { Gamepad2, Library, Plus, Github } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "library" | "admin" | "play";

interface Route {
  view: View;
  gameId?: string;
}

function parseHash(): Route {
  if (typeof window === "undefined") return { view: "library" };
  const h = window.location.hash.replace(/^#\/?/, "").trim();
  if (h === "admin") return { view: "admin" };
  if (h.startsWith("play/")) return { view: "play", gameId: h.slice(5) };
  return { view: "library" };
}

export default function Home() {
  const [route, setRoute] = useState<Route>({ view: "library" });
  const [games, setGames] = useState<GameRecord[] | null>(null);

  const loadGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      setGames(data.games || []);
    } catch {
      setGames((g) => g ?? []);
    }
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(loadGames, 0);
    return () => window.clearTimeout(t);
  }, [loadGames]);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  const playingGame =
    route.view === "play" && games ? games.find((g) => g.id === route.gameId) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("")}
            className="flex items-center gap-3 cursor-pointer min-w-0"
            aria-label="الصفحة الرئيسية"
          >
            <span className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <Gamepad2 className="size-6 text-primary-foreground" />
            </span>
            <span className="text-start min-w-0">
              <span className="block font-black text-lg leading-none">
                PSP <span className="text-primary">كلاود</span>
              </span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                مشغل ألعاب بلايستيشن بورتبل
              </span>
            </span>
          </button>

          <nav className="flex items-center gap-2" aria-label="التنقل الرئيسي">
            <Button
              variant={route.view === "library" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => navigate("")}
              className="gap-2"
              aria-current={route.view === "library" ? "page" : undefined}
            >
              <Library className="size-4" />
              <span className="hidden sm:inline">المكتبة</span>
            </Button>
            <Button
              variant={route.view === "admin" ? "secondary" : "default"}
              size="sm"
              onClick={() => navigate("admin")}
              className="gap-2"
              aria-current={route.view === "admin" ? "page" : undefined}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">إضافة لعبة</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {route.view === "library" && (
          <LibraryView
            games={games}
            onPlay={(id) => navigate(`play/${id}`)}
            onAdd={() => navigate("admin")}
          />
        )}

        {route.view === "admin" && (
          <AdminView
            games={games}
            onSaved={loadGames}
            onBack={() => navigate("")}
          />
        )}

        {route.view === "play" &&
          (games === null ? (
            <div className="container mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
              جاري تحميل بيانات اللعبة...
            </div>
          ) : playingGame ? (
            <PlayView game={playingGame} onExit={() => navigate("")} />
          ) : (
            <div className="container mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
              <p className="text-lg font-semibold">اللعبة غير موجودة</p>
              <p className="text-muted-foreground">
                قد تكون هذه اللعبة حُذفت من المكتبة.
              </p>
              <Button onClick={() => navigate("")}>رجوع إلى المكتبة</Button>
            </div>
          ))}
      </main>

      <footer className="mt-auto border-t bg-card/50">
        <div className="container mx-auto max-w-7xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            يعمل بتقنية{" "}
            <a
              href="https://emulatorjs.org"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              EmulatorJS
            </a>{" "}
            و{" "}
            <a
              href="https://www.ppsspp.org"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              PPSSPP
            </a>{" "}
            — مخصص للألعاب التي تملكها قانونياً فقط.
          </p>
          <p className="flex items-center gap-1.5" dir="ltr">
            <Github className="size-4" />
            PSP Cloud Player · Railway Ready
          </p>
        </div>
      </footer>
    </div>
  );
}
