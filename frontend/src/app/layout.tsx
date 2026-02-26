import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Gia phả dòng họ Nguyễn",
  description:
    "Gia phả dòng họ Nguyễn — Quản lý gia phả & kết nối cộng đồng dòng họ",
  keywords: [
    "gia phả",
    "gia phả dòng họ",
    "dòng họ Nguyễn",
    "quản lý gia phả",
    "kết nối dòng họ",
    "gia tộc",
    "cây gia phả",
    "tộc phổ",
  ],
  authors: [{ name: "Ban Quản Trị" }],
  openGraph: {
    title: "Gia phả dòng họ Nguyễn",
    description:
      "Gia phả dòng họ Nguyễn — Quản lý gia phả & kết nối cộng đồng dòng họ",
    siteName: "Gia Phả Dòng Họ",
    images: [
      {
        url: "/banner-seo.jpg",
        width: 1200,
        height: 630,
        alt: "Banner Gia phả dòng họ Nguyễn",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gia phả dòng họ Nguyễn",
    description:
      "Gia phả dòng họ Nguyễn — Quản lý gia phả & kết nối cộng đồng dòng họ",
    images: ["/banner-seo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${beVietnamPro.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
