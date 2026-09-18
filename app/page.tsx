import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";

export const metadata: Metadata = {
  title: "ReplyHalo - Instagram comment-to-DM automation",
  description:
    "Turn Instagram comments and DM keywords into automated private replies, tracked links, follow gates, and follow-ups with ReplyHalo.",
};

const features = [
  {
    title: "Comment → DM",
    body: "Trigger private replies when someone comments a keyword on a selected post, reel, or across your account.",
  },
  {
    title: "Public replies",
    body: "Reply under the comment automatically and rotate multiple reply variants so conversations feel less repetitive.",
  },
  {
    title: "Follow Gate",
    body: "Ask people to follow first, verify the follow when Instagram allows it, then reveal the promised information.",
  },
  {
    title: "Tracked links + CTR",
    body: "Send tracked buttons, count clicks, and see campaign CTR directly inside the dashboard.",
  },
  {
    title: "Follow-ups",
    body: "Schedule a follow-up after the link is delivered while staying inside Instagram's permitted messaging window.",
  },
  {
    title: "DM keyword trigger",
    body: "Run the same campaign when a person sends the configured keyword directly in Instagram Direct.",
  },
];

const flow = [
  {
    step: "01",
    title: "Connect Instagram",
    body: "Connect an Instagram professional account through the official Meta OAuth flow.",
  },
  {
    step: "02",
    title: "Build the campaign",
    body: "Choose the post, keyword, public reply, private message, links, follow gate, and follow-up.",
  },
  {
    step: "03",
    title: "Let ReplyHalo handle delivery",
    body: "Incoming events are matched, queued, sent, logged, and reflected in campaign analytics.",
  },
];

const plans = [
  {
    name: "SOLO",
    accounts: "1 social account",
    description: "For a creator, expert, or small business running one connected account.",
  },
  {
    name: "CREATOR",
    accounts: "Up to 3 social accounts",
    description: "For creators or teams operating several brands or regional accounts.",
  },
  {
    name: "AGENCY",
    accounts: "Up to 10 social accounts",
    description: "For agencies and operators managing multiple client or brand accounts.",
  },
];

const safeguards = [
  "Official Meta OAuth and API integration",
  "Encrypted social-account tokens at rest",
  "Workspace-scoped campaigns, accounts, and logs",
  "Queue-backed delivery and retry handling",
  "Webhook validation and operational diagnostics",
  "Safe disconnect that preserves campaigns and history",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader active="home" />

      <section className="border-b border-white/10 bg-zinc-950/70">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">
              Instagram automation built around real conversations
            </div>
            <h1 className="mt-7 text-balance text-5xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Turn the right comment into the right DM
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
              ReplyHalo automates Instagram comment-to-DM campaigns with public
              replies, Follow Gate, tracked links, CTR, DM keyword triggers, and
              follow-ups — all from one workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center bg-cyan-300 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200"
              >
                Get started
              </Link>
              <Link
                href="/templates"
                className="inline-flex items-center justify-center border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Browse templates
              </Link>
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Example campaign
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded border border-white/10 bg-zinc-950/70 p-4">
                <p className="text-xs text-zinc-500">Comment</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  @customer: INFO
                </p>
              </div>
              <div className="rounded border border-white/10 bg-zinc-950/70 p-4">
                <p className="text-xs text-zinc-500">Public reply</p>
                <p className="mt-1 text-sm text-zinc-300">
                  I sent it in Direct — check Requests too if you don&apos;t see it.
                </p>
              </div>
              <div className="rounded border border-cyan-200/20 bg-cyan-300/10 p-4">
                <p className="text-xs text-cyan-100">Private flow</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Follow Gate → information → tracked button → follow-up
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-white/10 p-4">
                  <p className="text-xs text-zinc-500">Clicks</p>
                  <p className="mt-1 text-2xl font-black text-white">128</p>
                </div>
                <div className="rounded border border-white/10 p-4">
                  <p className="text-xs text-zinc-500">CTR</p>
                  <p className="mt-1 text-2xl font-black text-white">34.6%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase text-cyan-200">Core automation</p>
          <h2 className="mt-3 text-4xl font-black text-white sm:text-5xl">
            Everything around the comment-to-DM loop
          </h2>
          <p className="mt-5 text-base leading-8 text-zinc-400">
            Build campaigns around the actions that creators, experts, online
            schools, affiliate marketers, and ecommerce teams already use every day.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="border border-white/10 bg-white/[0.035] p-6"
            >
              <h3 className="text-xl font-bold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] py-20">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase text-emerald-200">How it works</p>
            <h2 className="mt-3 text-4xl font-black text-white sm:text-5xl">
              Connect once. Build campaigns. Measure what happens.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {flow.map((item) => (
              <article key={item.step} className="border border-white/10 bg-zinc-950/60 p-6">
                <p className="text-sm font-black text-cyan-200">{item.step}</p>
                <h3 className="mt-4 text-2xl font-black text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-zinc-500">
            Instagram controls inbox placement. A first-contact private reply may
            appear in Requests or Hidden Requests; ReplyHalo surfaces this clearly
            so campaign copy can prepare users for it.
          </p>
        </div>
      </section>

      <section id="plans" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase text-cyan-200">Plans</p>
          <h2 className="mt-3 text-4xl font-black text-white sm:text-5xl">
            Start with the account capacity you need
          </h2>
          <p className="mt-5 text-base leading-8 text-zinc-400">
            ReplyHalo plans control how many social accounts can be connected to
            a workspace. Campaigns and history stay tied to that workspace.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="border border-white/10 bg-white/[0.035] p-6">
              <p className="text-sm font-bold text-cyan-200">{plan.name}</p>
              <h3 className="mt-3 text-2xl font-black text-white">{plan.accounts}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{plan.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="security" className="border-y border-white/10 bg-zinc-950/70 py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-200">Security</p>
            <h2 className="mt-3 text-4xl font-black text-white sm:text-5xl">
              Built for connected customer workspaces
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-400">
              The product uses official account authorization, encrypted credentials,
              workspace isolation, and operational diagnostics instead of browser
              scraping or password sharing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {safeguards.map((item) => (
              <div key={item} className="border border-white/10 bg-white/[0.035] p-5 text-sm font-semibold text-zinc-300">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <div className="border border-cyan-200/20 bg-cyan-300/10 p-8 text-center sm:p-12">
          <h2 className="text-4xl font-black text-white sm:text-5xl">
            Build your first ReplyHalo campaign
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
            Sign in, activate your workspace, connect Instagram, and configure the
            exact comment-to-DM flow you want to run.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center bg-cyan-300 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-semibold text-zinc-300">ReplyHalo</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms</Link>
            <Link href="/data-deletion" className="transition hover:text-white">Data deletion</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
