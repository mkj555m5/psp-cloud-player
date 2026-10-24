"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameRecord } from "@/lib/types";
import { formatBytes } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Play,
  Settings2,
  MonitorUp,
  Save,
  Rewind,
  Sparkles,
  Hand,
  Loader2,
  Gamepad2,
} from "lucide-react";

const EJS_DATA = "https://cdn.emulatorjs.org/stable/data/";

interface Props {
  game: GameRecord;
  onExit: () => void;
}

interface EmuSettings {
  fullscreenOn: boolean;
  saveStateLocation: "browser" | "download";
  rewindEnabled: boolean;
  shader: string;
  virtualGamepad: boolean;
}

export default function PlayView({ game, onExit }: Props) {
  const [phase, setPhase] = useState<"settings" | "loading">("settings");
  const [settings, setSettings] = useState<EmuSettings>({
    fullscreenOn: true,
    saveStateLocation: "browser",
    rewindEnabled: false,
    shader: "disabled",
    virtualGamepad: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const set = <K extends keyof EmuSettings>(key: K, value: EmuSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  /** إزالة كاملة لكل ما أنشأه المحاكي */
  const cleanupEmulator = useCallback(() => {
    const w = window as unknown as Record<string, unknown>;
    const keys = [
      "EJS_player",
      "EJS_core",
      "EJS_gameUrl",
      "EJS_gameName",
      "EJS_gameID",
      "EJS_pathtodata",
      "EJS_startOnLoaded",
      "EJS_fullscreenOnLoaded",
      "EJS_backgroundColor",
      "EJS_defaultOptions",
      "EJS_emulator",
      "EJS_ready",
      "EJS_onGameStart",
    ];
    keys.forEach((k) => delete w[k]);
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }
    if (containerRef.current) containerRef.current.innerHTML = "";
  }, []);

  useEffect(() => {
    return () => {
      cleanupEmulator();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [cleanupEmulator]);

  /** زر البدء: يبدّل للشاشة السحابية فقط — والتهيئة تحدث بعد ظهور الحاوية */
  const startGame = () => setPhase("loading");

  // تهيئة المحاكي بعد ظهور حاوية اللعب
  useEffect(() => {
    if (phase !== "loading" || !containerRef.current) return;

    const boot = async () => {
      cleanupEmulator();

      // طلب ملء الشاشة ضمن نافذة تفعيل المستخدم
      if (settings.fullscreenOn) {
        try {
          await containerRef.current?.requestFullscreen();
        } catch {
          /* قد يرفضه المتصفح — يبقى الزر اليدوي متاحاً */
        }
      }

      const w = window as unknown as Record<string, unknown>;
      w.EJS_player = "#ejs-game-container";
      w.EJS_core = "ppsspp";
      w.EJS_gameUrl = `/api/games/${game.id}/file/${game.id}.${game.ext}`;
      w.EJS_gameName = game.name;
      w.EJS_gameID = game.id;
      w.EJS_pathtodata = EJS_DATA;
      w.EJS_startOnLoaded = true;
      w.EJS_backgroundColor = "#000000";
      // نواة ppsspp تتطلب خيوط متعددة (تعمل بفضل عزل COOP/COEP من middleware)
      w.EJS_threads = true;
      w.EJS_disableDatabases = true;
      if (settings.fullscreenOn) w.EJS_fullscreenOnLoaded = true;
      w.EJS_defaultOptions = {
        "save-state-location": settings.saveStateLocation,
        rewindEnabled: settings.rewindEnabled ? "enabled" : "disabled",
        shader: settings.shader,
        "virtual-gamepad": settings.virtualGamepad ? "enabled" : "disabled",
      };

      const script = document.createElement("script");
      script.src = `${EJS_DATA}loader.js`;
      script.async = true;
      scriptRef.current = script;
      document.body.appendChild(script);
    };
    boot();
  }, [phase]);

  const exitGame = () => {
    cleanupEmulator();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onExit();
  };

  // ============ شاشة اللعب ============
  if (phase !== "settings") {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-black/90 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <Gamepad2 className="size-5 text-primary shrink-0" />
            <span className="text-sm font-bold text-white truncate">
              {game.name}
            </span>
            <Badge variant="secondary" className="uppercase hidden sm:inline-flex">
              {game.ext}
            </Badge>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={exitGame}
            className="gap-2 shrink-0"
          >
            إنهاء اللعبة
          </Button>
        </div>
        <div className="flex-1 relative min-h-0">
          <div
            id="ejs-game-container"
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
          />
          {phase === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
              <Loader2 className="size-12 animate-spin text-primary" />
              <p className="text-white/80 font-semibold">
                جاري تشغيل المحاكي وتحميل اللعبة من الخادم السحابي...
              </p>
              <p className="text-white/50 text-sm">
                قد تستغرق الألعاب الكبيرة وقتاً أطول في التحميل الأولى
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ شاشة الإعدادات ============
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Button
        variant="ghost"
        onClick={onExit}
        className="mb-4 gap-2 text-muted-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع إلى المكتبة
      </Button>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* بطاقة اللعبة */}
        <Card className="overflow-hidden self-start">
          <div className="relative aspect-[3/4] bg-muted">
            <img
              src={`/api/games/${game.id}/cover`}
              alt={`غلاف لعبة ${game.name}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-bold text-lg leading-snug">{game.name}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge className="uppercase font-mono">{game.ext}</Badge>
              <Badge variant="secondary" dir="ltr">
                {formatBytes(game.size)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* الإعدادات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              إعدادات التشغيل
            </CardTitle>
            <CardDescription>
              اضبط المحاكي ثم اضغط زر البدء لينطلق بملء الشاشة. يمكنك تغيير كل
              شيء لاحقاً من قائمة المحاكي داخل اللعبة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <SettingRow
              icon={<MonitorUp className="size-5 text-primary" />}
              title="بدء بملء الشاشة"
              desc="تتكبير الشاشة تلقائياً عند بدء اللعب"
            >
              <Switch
                checked={settings.fullscreenOn}
                onCheckedChange={(v) => set("fullscreenOn", v)}
                aria-label="بدء بملء الشاشة"
              />
            </SettingRow>

            <Separator />

            <SettingRow
              icon={<Save className="size-5 text-primary" />}
              title="مكان حفظ الحالات"
              desc="حفظ حالة اللعب داخل المتصفح أو تنزيلها كملف"
            >
              <Select
                value={settings.saveStateLocation}
                onValueChange={(v) => set("saveStateLocation", v as EmuSettings["saveStateLocation"])}
              >
                <SelectTrigger className="w-36" aria-label="مكان حفظ الحالات">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">المتصفح</SelectItem>
                  <SelectItem value="download">تنزيل ملف</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            <SettingRow
              icon={<Sparkles className="size-5 text-primary" />}
              title="معالج الصورة"
              desc="مرشحات لتحسين مظهر الرسوميات القديمة"
            >
              <Select
                value={settings.shader}
                onValueChange={(v) => set("shader", v)}
              >
                <SelectTrigger className="w-36" aria-label="معالج الصورة">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">بدون</SelectItem>
                  <SelectItem value="crt-easymode.glslp">CRT كلاسيكي</SelectItem>
                  <SelectItem value="crt-geom.glslp">CRT واقعي</SelectItem>
                  <SelectItem value="2xScaleHQ.glslp">تكبير حاد</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            <SettingRow
              icon={<Hand className="size-5 text-primary" />}
              title="أزرار اللمس (للجوال)"
              desc="عرض عصا التحكم والأزرار على الشاشة"
            >
              <Switch
                checked={settings.virtualGamepad}
                onCheckedChange={(v) => set("virtualGamepad", v)}
                aria-label="أزرار اللمس"
              />
            </SettingRow>

            <Separator />

            <SettingRow
              icon={<Rewind className="size-5 text-primary" />}
              title="إعادة الترجيع"
              desc="الرجوع للخلف في اللعب (يستهلك موارد أعلى)"
            >
              <Switch
                checked={settings.rewindEnabled}
                onCheckedChange={(v) => set("rewindEnabled", v)}
                aria-label="إعادة الترجيع"
              />
            </SettingRow>

            <Button
              size="lg"
              onClick={startGame}
              className="w-full gap-2 text-base shadow-lg shadow-primary/25 mt-2"
            >
              <Play className="size-5 fill-current" />
              بدء اللعب
            </Button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              عند بدء اللعب: زر ⏶ في الأسفل يفتح قائمة المحاكي (حفظ/تحميل،
              الإعدادات، الخروج) — ولوحة المفاتيح تعمل للتحكم على الحاسب.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
