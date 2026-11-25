"use client";

import { useEffect, useRef, useState } from "react";

export default function PhysicalAndroidPreview() {
  const [deviceReady, setDeviceReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/mobile-studio/device", { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Android is offline");
        if (alive) setDeviceReady(Boolean(body.ready));
      })
      .catch((error: unknown) => {
        if (alive) setNotice(error instanceof Error ? error.message : "Android is offline");
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!enabled || !deviceReady) return;
    const timer = setInterval(() => setRevision(value => value + 1), 2500);
    return () => clearInterval(timer);
  }, [enabled, deviceReady]);

  async function tap(event: React.MouseEvent<HTMLImageElement>) {
    if (busy) return;
    const image = imageRef.current;
    if (!image?.naturalWidth || !image?.naturalHeight) return;
    const box = image.getBoundingClientRect();
    const x = Math.max(0, Math.min(image.naturalWidth - 1, Math.round((event.clientX - box.left) / box.width * image.naturalWidth)));
    const y = Math.max(0, Math.min(image.naturalHeight - 1, Math.round((event.clientY - box.top) / box.height * image.naturalHeight)));
    setBusy(true);
    setNotice("");
    try {
      const result = await fetch("/api/mobile-studio/preview/tap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
      });
      if (!result.ok) {
        const body = await result.json().catch(() => ({}));
        throw new Error(body.error || "Android touch failed");
      }
      setRevision(value => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Android touch failed");
    } finally {
      setBusy(false);
    }
  }

  async function back() {
    setBusy(true);
    try {
      const result = await fetch("/api/mobile-studio/preview/back", { method: "POST" });
      if (!result.ok) throw new Error("Back button failed");
      setRevision(value => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Back button failed");
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5 sm:p-7 text-[#eceef3]">
      <h2 className="text-lg font-semibold">Android · живий екран у браузері</h2>
      <p className="mt-2 text-sm leading-6 text-[#9ca3b2]">
        Підключіть свій Android до Windows через USB. Після встановлення захищеного мосту
        екран телефона з'явиться тут. Натискайте безпосередньо на зображення.
        Ваші Instagram і TikTok залишаться на реальному телефоні.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" disabled={!deviceReady}
          onClick={() => { setEnabled(value => !value); setRevision(value => value + 1); }}
          className="rounded-lg bg-[#ef4274] px-4 py-2 text-sm font-semibold disabled:opacity-40">
          {enabled ? "Зупинити перегляд" : "Відкрити екран Android"}
        </button>
        {enabled && <button type="button" disabled={busy} onClick={() => void back()}
          className="rounded-lg border border-[#343846] px-4 py-2 text-sm disabled:opacity-40">Назад</button>}
      </div>
      {notice && <p role="alert" className="mt-3 text-sm text-amber-300">{notice}</p>}
      {enabled && deviceReady &&
        <div className="mt-5 flex justify-center overflow-hidden rounded-xl border border-[#343846] bg-black p-2">
          <img
            ref={imageRef}
            src={"/api/mobile-studio/preview/screenshot?t=" + revision}
            onClick={(event) => void tap(event)}
            onError={() => setNotice("Не вдалося отримати екран. Перевірте, що Android розблокований та USB debugging дозволений.")}
            alt="Поточний екран фізичного Android"
            className="max-h-[680px] max-w-full cursor-crosshair object-contain"
            draggable={false}
          />
        </div>}
      <p className="mt-3 text-xs text-[#9ca3b2]">
        Перший тест: бачимо живий екран і можемо натиснути кнопку Android. Швидкість оновлення 2,5 с;
        для постійної високочастотної трансляції надалі використаємо scrcpy/WebRTC.
      </p>
    </section>
  );
}
