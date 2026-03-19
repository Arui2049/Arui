"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Save, Check, Loader2, Settings, Shield, MessageSquare, Bell } from "lucide-react";

interface ShopSettings {
  shop: string;
  returnWindowDays: number;
  returnConditions: string[];
  welcomeMessage: string;
  language: string;
  tone: "friendly" | "professional" | "casual";
  notifyOnReturn: boolean;
  notifyEmail: string;
}

const CONDITION_OPTIONS = [
  { value: "unused", label: "Item must be unused" },
  { value: "original_packaging", label: "Original packaging required" },
  { value: "with_tags", label: "Tags still attached" },
  { value: "within_window", label: "Within return window" },
  { value: "no_final_sale", label: "Not a final sale item" },
];

function SectionCard({ icon: Icon, title, description, children }: { icon: typeof Settings; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
          <Icon className="h-4.5 w-4.5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => {
        if (r.status === 401) { router.push("/connect"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connect");
  };

  const update = <K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const toggleCondition = (cond: string) => {
    if (!settings) return;
    const next = settings.returnConditions.includes(cond)
      ? settings.returnConditions.filter((c) => c !== cond)
      : [...settings.returnConditions, cond];
    update("returnConditions", next);
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2">
              <img src="/logo.svg" alt="Auri Logo" className="h-7 w-7" />
              <span className="text-sm font-bold text-zinc-900">Auri</span>
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-medium text-zinc-600">Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
              {saved ? "Saved!" : "Save Changes"}
            </button>
            <Link href="/admin" className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-50 hover:border-zinc-300">
              <ArrowLeft className="h-3 w-3" />Dashboard
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-700">
              <LogOut className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Return Policy */}
        <SectionCard icon={Shield} title="Return Policy" description="Configure your store's return policy rules.">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Return Window (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={settings.returnWindowDays}
                onChange={(e) => update("returnWindowDays", parseInt(e.target.value, 10) || 30)}
                className="w-32 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
              <p className="mt-1 text-[11px] text-zinc-400">How many days after delivery customers can request a return.</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-zinc-700">Return Conditions</label>
              <div className="space-y-2">
                {CONDITION_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={settings.returnConditions.includes(opt.value)}
                      onChange={() => toggleCondition(opt.value)}
                      className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-xs text-zinc-700 group-hover:text-zinc-900">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* AI Behavior */}
        <SectionCard icon={MessageSquare} title="AI Behavior" description="Customize how the chatbot interacts with customers.">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Welcome Message</label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => update("welcomeMessage", e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none resize-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
              <p className="mt-1 text-[11px] text-zinc-400">{settings.welcomeMessage.length}/500 characters</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => update("language", e.target.value as ShopSettings["language"])}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                  <option value="pt">Português</option>
                  <option value="it">Italiano</option>
                  <option value="nl">Nederlands</option>
                  <option value="ru">Русский</option>
                  <option value="ar">العربية</option>
                  <option value="th">ภาษาไทย</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="id">Bahasa Indonesia</option>
                  <option value="tr">Türkçe</option>
                  <option value="pl">Polski</option>
                  <option value="sv">Svenska</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Tone</label>
                <select
                  value={settings.tone}
                  onChange={(e) => update("tone", e.target.value as "friendly" | "professional" | "casual")}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={Bell} title="Notifications" description="Get notified when customers submit return requests.">
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnReturn}
                onChange={(e) => update("notifyOnReturn", e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500"
              />
              <div>
                <span className="text-xs font-medium text-zinc-700">Email me on new return requests</span>
                <p className="text-[11px] text-zinc-400">Receive a notification when a customer submits a return or exchange.</p>
              </div>
            </label>

            {settings.notifyOnReturn && (
              <div className="animate-slide-down">
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Notification Email</label>
                <input
                  type="email"
                  value={settings.notifyEmail}
                  onChange={(e) => update("notifyEmail", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full max-w-sm rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
