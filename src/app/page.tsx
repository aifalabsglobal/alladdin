import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="glass-card rounded-3xl p-8 sm:p-12">
        <div className="flex flex-wrap items-center gap-6">
          <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
            <Image
              src="/logo.png"
              alt="Alladin logo"
              width={72}
              height={72}
              className="h-18 w-18 object-contain"
              priority
            />
          </span>
          <div>
            <p className="mb-2 inline-flex rounded-full bg-ai/15 px-3 py-1 text-xs font-semibold text-ai">
              Predict. Analyze. Explain.
            </p>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Alladin shows the health of NSE/BSE stocks in plain language.
            </h1>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
          Each stock gets a composite Health Score (0–100) built from weighted
          influencers — technical, fundamental, sentiment, flow, and macro
          factors. Every score comes with a one-sentence explanation of what is
          driving it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-2xl bg-positive px-5 py-3 text-sm font-semibold text-canvas shadow-sm transition hover:bg-positive-soft"
          >
            Open dashboard
          </Link>
          <Link
            href="/stocks"
            className="rounded-2xl border border-line bg-card px-5 py-3 text-sm font-semibold text-ink transition hover:bg-card-raised"
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
          <article key={card.title} className="glass-card rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-ink">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
