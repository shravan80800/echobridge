import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/components/layout/RoleContext";
import { Navbar } from "@/components/layout/Navbar";
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
  description:
    "Every claim cited. Every access controlled. Nothing lost when people leave.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-100 selection:text-teal-900 flex flex-col overflow-x-hidden">
        <RoleProvider>
          <Navbar />
          <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </div>
          <AuditLogDrawer />
        </RoleProvider>
      </body>
    </html>
  );
}
