import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bob Comic Studio",
  description: "The AI Operating System for Visual Storytelling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex h-full overflow-hidden antialiased" style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <ThemeProvider>
          <Sidebar />
          <main className="flex flex-col flex-1 overflow-y-auto min-h-full">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
