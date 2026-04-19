import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import PinGate from "./components/PinGate";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "MCAT Mastery — Adaptive MCAT Prep",
  description: "Personalized MCAT study plans, practice questions, and analytics to help you hit your target score.",
  icons: {
    apple: "/apple-touch-icon.jpeg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const hasClerkPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!hasClerkPublishableKey) {
    return (
      <html lang="en" className={`${geist.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})()` }} />
          <PinGate>{children}</PinGate>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})()` }} />
          <PinGate>{children}</PinGate>
        </body>
      </html>
    </ClerkProvider>
  );
}
