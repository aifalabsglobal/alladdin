import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { isClerkEnabled } from "@/lib/auth";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alladin — Global markets research terminal",
  description:
    "Multi-asset observations, explainable health scores, calibrated directional research, and paper risk tools. Educational only — not investment advice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = isClerkEnabled();
  const shell = <AppShell authEnabled={authEnabled}>{children}</AppShell>;
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {authEnabled ? <ClerkProvider>{shell}</ClerkProvider> : shell}
      </body>
    </html>
  );
}
