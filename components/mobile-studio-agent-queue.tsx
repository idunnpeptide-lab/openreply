"use client";

import { useEffect, useState } from "react";

type Item = { id: string; bytes: number; caption: string; platforms: string[]; scheduled_at: string };
type Approved = { run_id: string; status: string; expires_at: number };

export default function MobileStudioAgentQueue() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [platform, setPlatform] = useState("instagram");
  const [account, setAccount] = useState("");
  const [mode, setMode] = useState("now");
  const [consent, setConsent] = useState(false);
  const [approved, setApproved] = useState<Approved | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await fetch("/api/mobile-studio/content", { cache: "no-store" });
        const body = await result.json();
        if (!result.ok) throw new Error(body.error || "Content folder unavailable");
        if (alive) {
          setItems(body.items || []);
          setConfigured(Boolean(body.configured));
        }
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : "Content folder unavailable");
      }
    })();
    return () => { alive = false; };
  }, []);

  async function approve() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/mobile-studio/runs/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          account: account.trim(),
          content_ids: selected,
          publish_mode: mode,
          confirm_publish: consent,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Batch approval failed");
      setApproved(result as Approved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Batch approval failed");
    } finally {
      setLoading(false);
    }
  }

  const instruction = approved
    ? "Use ReplyHalo Mobile Studio. Approved run ID: " + approved.run_id +
      ". Platform: " + platform + ". Account: " + account +
      ". Content IDs: " + selected.join(", ") +
      ". Publication mode: " + mode +
      ". Inspect UI before each action, import approved video files, fill caption from Content metadata and publish only this approved batch. Verify results, stop on unknown UI or copyright prompts; never auto-accept rights you cannot verify. Do not like/save posts to simulate human behavior."
    : "";

  return (
    <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5 sm:p-7 text-[#eceef3]">
      <h2 className="text-lg font-bold">AI Publisher · Content Queue</h2>
      <p className="mt-2 text-sm text-[#9ca3b2]">
        Оберіть готові відео з папки Content і один раз дозвольте публікацію всієї партії.
        Потім Claude або ChatGPT зможе керувати Android через MCP у межах дозволеного запуску.
      </p>
      {!configured && <p className="mt-3 text-sm text-amber-300">Папка Content поки не підключена до Android-сервера.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
      <div className="mt-5 space-y-2">
        <div className="text-sm font-semibold">Готові відео</div>
        {items.length === 0 && <p className="text-sm text-[#9ca3b2]">Немає MP4 для публікації.</p>}
        {items.map(item => (
          <label key={item.id} className="flex items-start gap-3 rounded-lg border border-[#343846] p-3 text-sm">
            <input type="checkbox" checked={selected.includes(item.id)}
              onChange={(event) => setSelected(current => event.target.checked ? [...current, item.id] : current.filter(x => x !== item.id))}
              disabled={!!approved} className="mt-1" />
            <span>
              <strong>{item.id}.mp4</strong>
              <span className="ml-2 text-xs text-[#9ca3b2]">{(item.bytes / 1048576).toFixed(1)} MB</span>
              {item.caption && <span className="mt-1 block text-xs text-[#9ca3b2]">{item.caption.slice(0, 190)}</span>}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm">Платформа
          <select value={platform} onChange={event => setPlatform(event.target.value)} disabled={!!approved}
            className="mt-1 w-full rounded-lg border border-[#343846] bg-[#171a22] p-2">
            {["instagram","tiktok","youtube","x"].map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <label className="text-sm">Акаунт для публікації
          <input value={account} onChange={event => setAccount(event.target.value)} disabled={!!approved}
            placeholder="@username" maxLength={80}
            className="mt-1 w-full rounded-lg border border-[#343846] bg-[#171a22] p-2" />
        </label>
        <label className="text-sm">Режим
          <select value={mode} onChange={event => setMode(event.target.value)} disabled={!!approved}
            className="mt-1 w-full rounded-lg border border-[#343846] bg-[#171a22] p-2">
            <option value="now">Опублікувати зараз</option>
            <option value="draft">Чернетка (якщо доступно)</option>
            <option value="schedule">Запланувати (якщо доступно)</option>
          </select>
        </label>
      </div>
      {!approved && (
        <label className="mt-4 flex items-start gap-2 text-sm text-[#c5cad5]">
          <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" />
          <span>Я дозволяю AI-агенту підготувати й опублікувати лише вибрані відео на вказаному акаунті. Права на контент і музику мають бути підтверджені; агент повинен зупинитися, якщо не впевнений.</span>
        </label>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {!approved &&
          <button type="button" disabled={loading || !consent || !account.trim() || selected.length === 0 || selected.length > 20}
            onClick={() => void approve()}
            className="rounded-lg bg-[#ef4274] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            {loading ? "Створення дозволу…" : "Дозволити AI публікувати вибрану партію"}
          </button>}
        {approved &&
          <button type="button" onClick={() => navigator.clipboard.writeText(instruction)}
            className="rounded-lg bg-[#ef4274] px-4 py-2 text-sm font-semibold text-white">
            Копіювати завдання для Claude / ChatGPT
          </button>}
      </div>
      {approved &&
        <p role="status" className="mt-4 break-all text-sm text-emerald-300">
          Дозвіл активний до {new Date(approved.expires_at * 1000).toLocaleString("uk-UA")}. Run ID: {approved.run_id}
        </p>}
      <p className="mt-4 text-xs text-[#8b91a1]">Пілот: один Android, до 20 відео в одній партії, максимум 180 дій за 6 годин. Невідомі меню, CAPTCHA, права на музику або збої — причина зупинити завдання. Публікації потрібно перевіряти за фактичною появою в профілі.</p>
    </section>
  );
}
