import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/PWARegister";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#cc9933",
};

export const metadata: Metadata = {
  title: "Sabor Chugurano - Menú & Platos a la Carta",
  description: "Restaurante Sabor Chugurano: Deliciosos menús con entrada incluida y selectos platos a la carta tradicionales.",
  manifest: "/manifest.json",
  applicationName: "Sabor Chugurano",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sabor Chugurano",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/images/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/images/icon-192.png",
    apple: "/images/icon-192.png",
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} dark antialiased h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
