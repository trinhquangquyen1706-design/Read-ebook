import type { Metadata } from "next";
import { ReaderApp } from "./reader-app";

export const metadata: Metadata = {
  title: {
    absolute: "Dễ Đọc | Reader song ngữ",
  },
  description:
    "Định dạng lại văn bản dài thành nhịp đọc thoáng, dễ tập trung, phù hợp cho tiếng Việt và tiếng Anh.",
};

export default function Home() {
  return <ReaderApp />;
}
