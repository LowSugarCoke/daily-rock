import type { Metadata, Viewport } from "next";
import { Anton, IBM_Plex_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Daily Rock",
  description:
    "Systematically listening to rock music, one song a day. Tracking history, ratings, and classic rock evolution.",
  appleWebApp: {
    capable: true,
    title: "Daily Rock",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2eee5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${plexMono.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
