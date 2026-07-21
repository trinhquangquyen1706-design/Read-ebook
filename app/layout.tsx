import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lora, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  weight: "variable",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "vietnamese"],
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Dễ Đọc",
    template: "%s | Dễ Đọc",
  },
  description:
    "Công cụ định dạng lại văn bản dài để đọc thoáng và tập trung hơn.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${beVietnamPro.variable} ${lora.variable} ${sourceSerif.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
