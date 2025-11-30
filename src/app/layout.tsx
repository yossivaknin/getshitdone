import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { PWARegister } from '@/components/pwa-register';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "SitRep - Mission Control",
  description: "Tactical task management and mission control",
  manifest: "/manifest.json",
  themeColor: "#1F2937",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SitRep",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    return (
      <html lang="en" className={`h-full ${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
        <body className="bg-[#F4F5F7] h-full font-inter" suppressHydrationWarning>
          {children}
          <Toaster position="top-right" />
          <PWARegister />
        </body>
      </html>
    );
}
