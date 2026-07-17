"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { GlobalAssetSearch } from "@/components/assets/GlobalAssetSearch";
import { AuthControls } from "@/components/AuthControls";
import { CommandPalette } from "@/components/CommandPalette";
import { Disclaimer } from "@/components/Disclaimer";
import { LiveMarketProvider } from "@/components/live/LiveMarketProvider";
import { TickerTape } from "@/components/TickerTape";
import { MarketStatus } from "@/components/ui/MarketStatus";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "◧" },
  { href: "/assets", label: "Assets", icon: "∿" },
  { href: "/sectors", label: "Equity sectors", icon: "▦" },
  { href: "/watchlist", label: "Watchlist", icon: "☆" },
  { href: "/paper", label: "Paper", icon: "▣" },
  { href: "/alerts", label: "Alerts", icon: "!" },
  { href: "/influencers", label: "Factors", icon: "⇄" },
  { href: "/calibration", label: "Model trust", icon: "◎" },
  { href: "/methodology", label: "Methodology", icon: "?" },
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
        <span className="block text-[11px] text-muted">Global markets research</span>
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

export function AppShell({
  children,
  authEnabled = false,
}: {
  children: ReactNode;
  authEnabled?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <LiveMarketProvider>
      <CommandPalette />
      <div className="flex min-h-screen flex-col md:flex-row">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-positive focus:px-3 focus:py-2 focus:text-canvas"
        >
          Skip to content
        </a>

        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
          <Brand />
          <div className="mt-8 flex-1">
            <NavLinks />
          </div>
          <p className="rounded-xl border border-line bg-card px-3 py-2 text-[11px] leading-relaxed text-muted">
            Educational signals only. Never buy/sell advice. Yahoo stream is an
            unofficial prototype feed.
          </p>
        </aside>

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <Brand />
          <button
            type="button"
            ref={closeBtnRef}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </header>

        {menuOpen ? (
          <div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="border-b border-line bg-surface px-4 py-4 md:hidden"
          >
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <TickerTape />
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface/80 px-4 py-2 sm:px-6 lg:px-8">
            <GlobalAssetSearch />
            <MarketStatus />
            {authEnabled ? (
              <div className="ml-auto">
                <AuthControls />
              </div>
            ) : null}
          </div>
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </main>
          <Disclaimer />
        </div>
      </div>
    </LiveMarketProvider>
  );
}
