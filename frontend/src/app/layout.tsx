import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RustDesk Custom Client Builder",
  description: "Configure and build your custom RustDesk client",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
