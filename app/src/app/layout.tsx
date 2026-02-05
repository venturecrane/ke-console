import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
  title: "Kid Expenses",
  description: "Co-parent expense tracking made simple. Split expenses, track payments, and stay balanced.",
  openGraph: {
    title: "Kid Expenses",
    description: "Co-parent expense tracking made simple. Split expenses, track payments, and stay balanced.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kid Expenses",
    description: "Co-parent expense tracking made simple. Split expenses, track payments, and stay balanced.",
    images: ["/og-image.svg"],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={{
        userButton: {
          action__manageAccount: "Settings",
        },
      }}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#4f46e5",
          colorBackground: "#0f172a",
          colorInputBackground: "#1e293b",
          colorInputText: "#e2e8f0",
          fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
        },
        elements: {
          card: "shadow-none border border-slate-800",
          formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
