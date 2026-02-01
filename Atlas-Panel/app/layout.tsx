import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { generateDefaultMetadata } from "./lib/metadata";
import { HomePageStructuredData } from "./lib/structured-data";
import SecurityTrackerProvider from "./components/SecurityTrackerProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = generateDefaultMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#111827" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Atlas" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Preconnect hints para melhorar performance */}
        <link rel="preconnect" href="https://api.atlasdao.info" />
        <link rel="dns-prefetch" href="https://api.atlasdao.info" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        <HomePageStructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SecurityTrackerProvider>
          {children}
        </SecurityTrackerProvider>
      </body>
    </html>
  );
}
