import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { WORLD_CUP_DISPLAY_NAME } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: WORLD_CUP_DISPLAY_NAME,
  description: "World Cup 2026 prediction portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
