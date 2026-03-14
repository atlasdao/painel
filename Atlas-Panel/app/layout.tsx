import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { generateDefaultMetadata } from "./lib/metadata";
import { HomePageStructuredData } from "./lib/structured-data";
import SecurityTrackerProvider from "./components/SecurityTrackerProvider";
import SupportWidget from "./components/SupportWidget";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = generateDefaultMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#09090b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Atlas" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Preconnect hints */}
        <link rel="preconnect" href="https://api.atlasdao.info" />
        <link rel="dns-prefetch" href="https://api.atlasdao.info" />
        <link rel="preconnect" href="https://api.fontshare.com" />

        {/* Theme initialization - prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('atlas-theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />

        <HomePageStructuredData />
      </head>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <SecurityTrackerProvider>
          {children}
        </SecurityTrackerProvider>
        <SupportWidget context="unlogged" />
      </body>
    </html>
  );
}
