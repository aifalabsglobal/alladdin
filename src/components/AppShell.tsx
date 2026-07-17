"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Disclaimer } from "@/components/Disclaimer";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "◧" },
  { href: "/stocks", label: "Stocks", icon: "∿" },
  { href: "/sectors", label: "Sectors", icon: "▦" },
  { href: "/watchlist", label: "Watchlist", icon: "☆" },
  { href: "/influencers", label: "Influencers", icon: "⇄" },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Alladin home">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-line">
        <Image
          src="/logo.png"
          alt="Alladin logo"
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
          priority
        />
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight text-ink">
          Alladin
        </span>
        <span className="block text-[11px] text-muted">NSE/BSE Stock Health</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {nav.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-positive/10 text-positive"
                : "text-muted hover:bg-card-raised hover:text-ink",
            )}
          >
            <span aria-hidden className="w-5 text-center text-base">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        <p className="rounded-xl border border-line bg-card px-3 py-2 text-[11px] leading-relaxed text-muted">
          Educational signals only. Never buy/sell advice.
        </p>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </header>

      {menuOpen ? (
        <div
          id="mobile-nav"
          className="border-b border-line bg-surface px-4 py-4 md:hidden"
        >
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <Disclaimer />
      </div>
    </div>
  );
}
