"use client";

import { useEffect, useRef, useState } from "react";
import type { GameRecord, DownloadProgress, DownloadStatus } from "@/lib/types";
import { formatBytes, statusLabel } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Link2,
  Image as ImageIcon,
  Tag,
  Lock,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Gamepad2,
} from "lucide-react";

const ACTIVE_STATUSES: DownloadStatus[] = ["downloading", "extracting", "saving"];

interface Props {
  onSaved: () => void;
  onBack: () => void;
  games: GameRecord[] | null;
}

export default function AdminView({ onSaved, onBack, games }: Props) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
  const doneSeen = useRef<Set<string>>(new Set());
  const gamesSnapshot = useRef<string>("");

  // متابعة تقدم التحميلات كل ثانيتين + تحديث المكتبة عند أي تغيير
  useEffect(() => {
    let timer: number;
    const poll = async () => {
      try {
        const [dlRes, gRes] = await Promise.all([
          fetch("/api/downloads"),
          fetch("/api/games"),
        ]);
        const dlData = await dlRes.json();
        const gData = await gRes.json();
        setDownloads(dlData.downloads || []);

        // كشف الألعاب المكتملة عبر سجل التقدم
        for (const d of (dlData.downloads || []) as DownloadProgress[]) {
          if (d.status === "done" && d.gameId && !doneSeen.current.has(d.id)) {
            doneSeen.current.add(d.id);
            toast({
              title: "تمت إضافة اللعبة",
              description: `"${d.name}" أصبحت جاهزة في المكتبة`,
            });
          }
        }

        // تحديث القائمة عند أي تغيير في بيانات الألعاب (شبكة أمان إضافية)
        const snapshot = JSON.stringify(gData.games || []);
        if (snapshot !== gamesSnapshot.current) {
          const isFirst = gamesSnapshot.current === "";
          gamesSnapshot.current = snapshot;
          if (!isFirst) onSaved();
        }
      } catch {
        // تجاهل أخطاء الاستطلاع المؤقتة
      }
      timer = window.setTimeout(poll, 2000);
    };
    poll();
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({ title: "الرابط مطلوب", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name, imageUrl, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "تعذر إضافة اللعبة",
          description: data.error || "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      } else {
        toast({
          title: "بدأ التحميل في الخلفية",
          description: "يمكنك متابعة التقدم أسفل هذه الصفحة",
        });
        setUrl("");
        setName("");
        setImageUrl("");
      }
    } catch {
      toast({
        title: "فشل الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (game: GameRecord) => {
    try {
      const res = await fetch(
        `/api/games/${game.id}?password=${encodeURIComponent(password)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "تعذر الحذف",
          description: data.error || "حدث خطأ",
          variant: "destructive",
        });
        return;
      }
      toast({ title: `تم حذف "${game.name}"` });
      onSaved();
    } catch {
      toast({ title: "فشل الاتصال بالخادم", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4 gap-2 text-muted-foreground"
      >
        <ArrowRight className="size-4" />
        رجوع إلى المكتبة
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Download className="size-6 text-primary" />
            إضافة لعبة من رابط مباشر
          </CardTitle>
          <CardDescription>
            ضع رابط تحميل مباشر (Direct Link) لملف اللعبة. الصيغ المدعومة:{" "}
            <span className="font-mono" dir="ltr">
              ISO, CSO, PBP, CHD
            </span>{" "}
            أو <span className="font-mono" dir="ltr">ZIP</span> يحتوي ملف لعبة.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="game-url" className="flex items-center gap-2">
                <Link2 className="size-4 text-primary" />
                رابط التحميل المباشر <span className="text-destructive">*</span>
              </Label>
              <Input
                id="game-url"
                dir="ltr"
                type="url"
                required
                placeholder="https://example.com/game.iso"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="game-name" className="flex items-center gap-2">
                  <Tag className="size-4 text-primary" />
                  اسم اللعبة (اختياري)
                </Label>
                <Input
                  id="game-name"
                  placeholder="مثال: God of War"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="game-cover" className="flex items-center gap-2">
                  <ImageIcon className="size-4 text-primary" />
                  رابط صورة الغلاف (اختياري)
                </Label>
                <Input
                  id="game-cover"
                  dir="ltr"
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-pass" className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                كلمة مرور الإدارة (إن كانت مفعّلة)
              </Label>
              <Input
                id="admin-pass"
                dir="ltr"
                type="password"
                placeholder="اتركها فارغة إذا لم تُفعّل الحماية"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="w-full gap-2">
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Download className="size-5" />
              )}
              إضافة إلى المكتبة
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* التحميلات النشطة */}
      {downloads.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">التحميلات الأخيرة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {downloads.map((d) => (
              <div key={d.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="font-semibold text-sm line-clamp-1">
                    {d.name}
                  </span>
                  <Badge
                    variant={
                      d.status === "done"
                        ? "default"
                        : d.status === "error"
                          ? "destructive"
                          : "secondary"
                    }
                    className="gap-1.5"
                  >
                    {d.status === "done" && (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    {d.status === "error" && <XCircle className="size-3.5" />}
                    {d.status === "error" || d.status === "done" ? (
                      <span className="inline-flex items-center gap-1">
                        {statusLabel(d.status)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" />
                        {statusLabel(d.status)}
                      </span>
                    )}
                  </Badge>
                </div>
                {ACTIVE_STATUSES.includes(d.status) && (
                  <>
                    <Progress value={d.percent || 5} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground" dir="ltr">
                      <span>
                        {formatBytes(d.received)}
                        {d.total > 0 ? ` / ${formatBytes(d.total)}` : ""}
                      </span>
                      <span>{d.percent}%</span>
                    </div>
                  </>
                )}
                {d.status === "error" && d.error && (
                  <p className="text-xs text-destructive leading-relaxed">
                    {d.error}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      {/* إدارة المكتبة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gamepad2 className="size-5 text-primary" />
            إدارة المكتبة ({games?.length ?? 0} لعبة)
          </CardTitle>
          <CardDescription>
            حذف لعبة يزيل ملفها وصورتها من التخزين نهائياً.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {games === null ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              جاري تحميل القائمة...
            </p>
          ) : games.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              المكتبة فارغة — أضف لعبتك الأولى من الأعلى.
            </p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {games.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <img
                    src={`/api/games/${g.id}/cover`}
                    alt=""
                    className="w-10 h-14 object-cover rounded-md bg-muted"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {g.ext.toUpperCase()} · {formatBytes(g.size)}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`حذف ${g.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          حذف &quot;{g.name}&quot; نهائياً؟
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف ملف اللعبة ({formatBytes(g.size)}) وصورة
                          الغلاف من التخزين السحابي. لا يمكن التراجع عن هذا
                          الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(g)}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          نعم، احذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
