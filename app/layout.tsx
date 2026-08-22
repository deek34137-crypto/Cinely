import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AdblockGateProvider } from "@/components/providers/adblock-gate-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinely — Universal Media Discovery & Ad-Free Streaming Engine",
  description: "Next-generation entertainment discovery platform with dual-engine stream resolution and 14 embed server fallbacks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#08080c] text-zinc-100 antialiased selection:bg-purple-600 selection:text-white">
        <AdblockGateProvider>
          <Navbar />
          <main className="flex-1 w-full pt-16">{children}</main>
          <Footer />
        </AdblockGateProvider>
      </body>
    </html>
  );
}
