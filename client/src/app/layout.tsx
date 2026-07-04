import "@/app/globals.css";
import "@/app/expressive-code.css";

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import Footer from "@/components/Footer";
import { Providers } from "./providers";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Incasino",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.className} suppressHydrationWarning>
        <Providers>
          <Navbar />
          {children}
          <div id="drawer"></div>
          <div id="modal"></div>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
