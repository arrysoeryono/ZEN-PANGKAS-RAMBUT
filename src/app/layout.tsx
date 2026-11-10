import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jakartaMono = JetBrains_Mono({
  variable: "--font-jakarta-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const APP_TITLE = "ZEN Pangkas Rambut";
const APP_DESC =
  "Aplikasi manajemen keuangan barbershop ZEN — catat pemasukan & pengeluaran, pantau laporan, kelola karyawan.";

export const metadata: Metadata = {
  title: {
    default: APP_TITLE,
    template: `%s · ${APP_TITLE}`,
  },
  description: APP_DESC,
  applicationName: APP_TITLE,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZEN Pangkas",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: APP_TITLE,
    description: APP_DESC,
    siteName: APP_TITLE,
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FBF3EF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${jakartaSans.variable} ${jakartaMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
