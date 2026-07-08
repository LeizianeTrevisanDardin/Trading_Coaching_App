import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/traderbot/AppNav";

export const metadata: Metadata = {
  title: "TraderBot AI",
  description: "Trade planner and risk calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}