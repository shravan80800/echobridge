import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/components/layout/RoleContext";
import { Navbar } from "@/components/layout/Navbar";
import { RoleScopeBanner } from "@/components/layout/RoleSwitcherBar";
import { AuditLogDrawer } from "@/components/layout/AuditLogDrawer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-canvas text-text-primary font-sans antialiased radial-glow selection:bg-accent-primary/30 selection:text-white flex flex-col">
        <RoleProvider>
          <Navbar />
          <RoleScopeBanner />
          <div className="flex-1">{children}</div>
          <AuditLogDrawer />
        </RoleProvider>
      </body>
    </html>
  );
}
