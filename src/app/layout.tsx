import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AttributionCapture } from "@/components/AttributionCapture";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Auri — AI-Powered Returns & Order Tracking",
  description: "Resolve returns and track orders inside the chat. No portals, no tickets. AI support for Shopify stores.",
  keywords: ["returns", "shopify", "ai", "customer support", "order tracking", "chatbot"],
  openGraph: {
    title: "Auri — AI Returns Inside the Chat",
    description: "Customers resolve returns in under 60 seconds. No portals, no tickets.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <AttributionCapture />
        {children}
      </body>
    </html>
  );
}
