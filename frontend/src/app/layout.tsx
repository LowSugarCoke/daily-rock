import type { Metadata, Viewport } from "next";
import { Caveat } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

// Handwriting, used only for the listening notes.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "700"],
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
  themeColor: "#f7f3ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={caveat.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
