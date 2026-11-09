import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoBridge — Permission-Aware Project Handover",
  description: "Every claim cited. Every access controlled. Nothing lost when people leave.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
