import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/context/auth-context";

export const metadata: Metadata = {
  title: "Savell's Lunch",
  description: "Family lunch tracker for Arlington ISD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-body">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
