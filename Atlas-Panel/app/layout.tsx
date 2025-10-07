import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Atlas DAO - A Ponte para Sua Soberania Financeira",
  description: "O Atlas Bridge é uma interface de minimização de confiança entre o sistema Pix e a Liquid Network, projetada para a sua autonomia financeira.",
  keywords: "Atlas DAO, DePix, PIX, Liquid Network, Bitcoin, Soberania Financeira, Descentralização",
  authors: [{ name: "Atlas DAO" }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "Atlas DAO - A Ponte para Sua Soberania Financeira",
    description: "Interface de minimização de confiança entre o sistema Pix e a Liquid Network",
    url: "https://atlasdao.finance",
    siteName: "Atlas DAO",
    images: [
      {
        url: "/atlas-logo.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
