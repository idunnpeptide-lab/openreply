"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import MobileStudioAgentQueue from "@/components/mobile-studio-agent-queue";
import PhysicalAndroidPreview from "@/components/mobile-studio-physical-preview";

type Device = {
  ready: boolean;
  platform: string;
  serial: string;
  apps: Record<string, boolean>;
};

type Imported = {
  media_id: string;
  android_path: string;
  bytes: number;
  published: false;
};

export default function MobileStudioClient() {
  const { locale } = useLocale();
  const uk = locale === "uk";
  const [device, setDevice] = useState<Device | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imported, setImported] = useState<Imported | null>(null);

  async function refresh() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/mobile-studio/device", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Android gateway is unavailable");
      setDevice(data as Device);
    } catch (caught) {
      setDevice(null);
      setError(caught instanceof Error ? caught.message : "Could not check Android");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function openApp(name: string) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/mobile-studio/apps/" + name + "/open", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not open app");
      setMessage(uk
        ? "Застосунок відкрито. Перевірте екран Android і підтвердіть публікацію вручну."
        : "App opened. Review the Android screen and confirm posting manually.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "App launch failed");
    } finally {
      setPending(false);
    }
  }

  async function uploadVideo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error(uk ? "Максимум 50 МБ для прототипу" : "50 MB pilot limit");
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/mobile-studio/media", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Video import failed");
      setImported(result as Imported);
      setMessage(uk
        ? "Відео імпортовано в Android. Відкрийте застосунок і завершіть публікацію самостійно."
        : "Video imported into Android. Open the app and finish publishing manually.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Video transfer failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 text-[#eceef3]">
      <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#9da2ae]">ReplyHalo</p>
            <h1 className="mt-1 text-2xl font-bold">Mobile Studio</h1>
          </div>
          <span className={"rounded-full border px-3 py-1 text-xs font-semibold " +
            (device?.ready ? "border-emerald-800 text-emerald-400" : "border-[#494d59] text-[#9ca3b2]")}>
            {device?.ready ? (uk ? "Android підключено" : "Android connected") : (uk ? "Android не підключено" : "Android not connected")}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#9ca3b2]">
          {uk
            ? "Ізольований Android для підготовки відео до публікації. Перегляд екрана — через захищений noVNC/SSH-тунель. Жодних автоматичних натискань «Опублікувати»."
            : "Isolated Android for preparing video posts. Screen viewing uses a private noVNC/SSH tunnel. No automatic Publish actions."}
        </p>
        <button type="button" disabled={pending} onClick={() => void refresh()}
          className="mt-4 rounded-lg border border-[#343846] px-3 py-2 text-sm disabled:opacity-50">
          {pending ? (uk ? "Перевірка…" : "Checking…") : (uk ? "Перевірити підключення" : "Check connection")}
        </button>
        {error && <p role="alert" className="mt-4 rounded-xl border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-300">{error}</p>}
        {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
      </section>

      <PhysicalAndroidPreview />

      <MobileStudioAgentQueue />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5">
          <h2 className="text-lg font-semibold">{uk ? "Імпортувати відео" : "Import video"}</h2>
          <p className="mt-2 text-sm text-[#9ca3b2]">
            {uk ? "MP4 до 50 МБ у тестовій версії. Файл з’явиться в Android Movies." : "MP4 up to 50 MB in this pilot. The file appears in Android Movies."}
          </p>
          <form className="mt-4 space-y-3" onSubmit={(event) => void uploadVideo(event)}>
            <input type="file" accept="video/mp4,.mp4"
              onChange={(event) => { setFile(event.target.files?.[0] || null); setImported(null); }}
              className="block w-full text-sm text-[#c5cad5] file:mr-3 file:rounded-lg file:border-0 file:bg-[#262a35] file:px-3 file:py-2 file:text-[#eceef3]"/>
            <button disabled={!device?.ready || !file || pending} type="submit"
              className="rounded-lg bg-[#ef4274] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {uk ? "Передати в Android" : "Send to Android"}
            </button>
          </form>
          {imported && (
            <p role="status" className="mt-3 break-all text-xs text-emerald-300">
              {uk ? "Готово, файл на пристрої:" : "File on device:"} {imported.android_path}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5">
          <h2 className="text-lg font-semibold">{uk ? "Відкрити мобільний застосунок" : "Open mobile app"}</h2>
          <p className="mt-2 text-sm text-[#9ca3b2]">
            {uk ? "Вхід і встановлення застосунків ви виконуєте на пристрої. Кнопки нижче лише відкривають установлені застосунки." :
              "Log in and install apps on the Android device yourself. These buttons only launch installed apps."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["instagram", "tiktok", "youtube", "x"] as const).map((app) => (
              <button key={app} type="button" disabled={!device?.ready || !device.apps[app] || pending}
                onClick={() => void openApp(app)}
                className="rounded-lg border border-[#343846] px-3 py-2 text-sm font-medium capitalize disabled:opacity-40">
                {app} {device && !device.apps[app] ? (uk ? "— не встановлено" : "— not installed") : ""}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5">
        <h2 className="text-lg font-semibold">{uk ? "Екран Android у браузері" : "Android screen in browser"}</h2>
        <p className="mt-2 text-sm leading-6 text-[#9ca3b2]">
          {uk
            ? "Вхід до noVNC тільки через захищений тунель. На своєму комп’ютері відкрийте SSH-тунель до Android-сервера, потім перейдіть на http://127.0.0.1:6080. Не відкривайте VNC-порт у публічний інтернет."
            : "Access noVNC only through a secured tunnel. Forward SSH to the Android host and open http://127.0.0.1:6080 on your computer. Never expose VNC publicly."}
        </p>
        <p className="mt-3 text-xs text-[#9ca3b2]">
          {uk ? "Публікація, вибір музики, підтвердження акаунта і фінальна перевірка залишаються за людиною." :
            "Publishing, selecting music, confirming the account and final review remain manual."}
        </p>
      </section>
    </div>
  );
}
