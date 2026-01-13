import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseCheck - Uptime Monitoring",
  description: "Monitor your websites and services uptime in real-time",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Root layout wrapper - all pages will use this layout */}
        {children}
      </body>
    </html>
  );
}
