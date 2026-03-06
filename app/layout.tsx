import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CareAxis — AI-Powered NDIS Toolkit",
  description:
    "Production-grade AI toolkit built exclusively for NDIS professionals. Generate compliant documentation, audit plans, forecast budgets, and synthesize complex reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
