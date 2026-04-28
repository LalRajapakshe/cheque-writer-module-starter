import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cheque Writer",
  description: "Integrated cheque writer module for ERP payment vouchers",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
