import type { Metadata, Viewport } from "next";
import { Playfair_Display, Roboto } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import PinGate from "./components/PinGate";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

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
      <html lang="en" className={`${playfair.variable} ${roboto.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})()` }} />
          <PinGate>{children}</PinGate>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider>
      <html lang="en" className={`${playfair.variable} ${roboto.variable} h-full`}>
        <body className="min-h-full flex flex-col antialiased">
          <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})()` }} />
          <PinGate>{children}</PinGate>
        </body>
      </html>
    </ClerkProvider>
  );
}
