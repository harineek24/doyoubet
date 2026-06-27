import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function CSJourneyLayout({ children }: { children: React.ReactNode }) {
  return <div className={playfair.variable} style={{ height: "100%" }}>{children}</div>;
}
