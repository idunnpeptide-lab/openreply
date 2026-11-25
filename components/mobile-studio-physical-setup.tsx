"use client";

import { useEffect, useState } from "react";

export default function PhysicalAndroidSetup() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/mobile-studio/setup", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Setup unavailable");
        if (alive) {
          setWorkspaceId(data.workspace_id || "");
          setConnected(Boolean(data.configured));
        }
      })
      .catch((err: unknown) => { if (alive) setError(err instanceof Error ? err.message : "Setup unavailable"); });
    return () => { alive = false; };
  }, []);

  return (
    <details className="rounded-2xl border border-[#343846] bg-[#12141a] p-5 text-[#eceef3]">
      <summary className="cursor-pointer text-base font-semibold">Підключення власного Android · Windows / USB</summary>
      <p className="mt-3 text-sm text-[#a2a9b5]">
        Ваші наявні Instagram, TikTok, YouTube та X залишаться авторизованими на телефоні.
        Програма використовує Android Debug Bridge (ADB), без емулятора або скидання акаунтів.
      </p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-[#d5d8df]">
        <li>Увімкніть на Android «Для розробників» → «Налагодження USB». Підключіть телефон до Windows і підтвердьте RSA-ключ комп'ютера на самому телефоні.</li>
        <li>Встановіть офіційні Android Platform Tools (ADB) і Python 3.11+. Для перевірки: <code className="text-[#ff7292]">adb devices -l</code> має показувати один пристрій зі статусом <code>device</code>.</li>
        <li>У репозиторії ReplyHalo відкрийте <code>services/mobile-studio</code> та запустіть PowerShell-скрипт <code>start-windows.ps1</code>. Він створить локальний конфігураційний файл із випадковим секретним токеном.</li>
        <li>Вставте свій Workspace ID у локальний файл <code>.env</code> і повторно запустіть скрипт.</li>
        <li>У Cloudflare Zero Trust налаштуйте Tunnel із захищеним Access service token до <code>http://127.0.0.1:8788</code>; у Railway MCP staging додайте URL, gateway token та Cloudflare Access client credentials.</li>
        <li>Натисніть «Перевірити підключення». Коли статус буде «Android підключено», відкрийте живий екран і перевірте натискання.</li>
      </ol>
      {workspaceId && (
        <div className="mt-4 rounded-xl border border-[#343846] bg-[#171a22] p-3">
          <p className="text-xs text-[#9aa1ae]">Ваш Workspace ID для MOBILE_STUDIO_WORKSPACE_ID</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all text-sm">{workspaceId}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(workspaceId)}
              className="rounded-lg border border-[#505666] px-3 py-1 text-xs">Копіювати</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
      <p className="mt-3 text-xs text-[#a2a9b5]">
        {connected ? "З'єднання налаштовано в Railway; перевірте фізичний телефон." : "Налаштування Cloudflare/шлюзу в Railway ще не завершено."}
        {" "}Не вводьте паролі соцмереж у ReplyHalo або в чат.
      </p>
      <a href="https://github.com/idunnpeptide-lab/openreply/tree/feat/replyhalo-mcp-byo-ai-v1/services/mobile-studio"
        target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-[#ff7292] underline">
        Відкрити код і інструкцію Mobile Studio на GitHub
      </a>
    </details>
  );
}
