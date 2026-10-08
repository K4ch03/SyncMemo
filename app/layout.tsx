import type { Metadata, Viewport } from "next";
import "./globals.css";
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};
export const metadata: Metadata = {
  title: "LinqEditor | メモ帳",
  description: "思いついたことを、すぐに。自分のためのシンプルなメモ帳。",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
