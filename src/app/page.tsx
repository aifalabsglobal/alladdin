import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 sm:p-12">
        <p className="mb-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Phase 1 — Scaffold + Schema + Seed
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Alladin shows the health of NSE/BSE stocks in plain language.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
          Each stock gets a composite Health Score (0–100) built from weighted
          influencers — technical, fundamental, sentiment, flow, and macro
          factors. Every score comes with a one-sentence explanation of what is
          driving it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-gradient-to-r from-accent-from to-accent-to px-5 py-3 text-sm font-semibold text-white shadow-sm"
          >
            Open dashboard
          </Link>
          <Link
            href="/stocks"
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-ink"
          >
            Browse stocks
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Explainable health",
            body: "See which influencers moved a score and by how many points.",
          },
          {
            title: "Short-term outlooks",
            body: "Directional signals with confidence — never buy/sell language.",
          },
          {
            title: "Indian markets focus",
            body: "Built around NSE/BSE symbols, FII/DII flows, and India VIX.",
          },
        ].map((card) => (
          <article
            key={card.title}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100"
          >
            <h2 className="text-lg font-semibold text-ink">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
