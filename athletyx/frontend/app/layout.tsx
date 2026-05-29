import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Athletyx",
  description: "Minimal inputs, rich outputs — premium fitness intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="athletyx-backdrop min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
