import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Rock",
  description:
    "Systematically listening to rock music, one song a day. Tracking history, ratings, and classic rock evolution.",
  appleWebApp: {
    capable: true,
    title: "Daily Rock",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
