import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "余白 | メモ帳",
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
