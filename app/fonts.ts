import { DM_Sans, JetBrains_Mono, Outfit } from "next/font/google";

export const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
export const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const fontVariables = `${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable}`;
