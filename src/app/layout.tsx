import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VerseGarden | Where Your Words Take Root",
  description: "A magical 30-second emotional experience where every kind word, hopeful phrase, and dream grows a beautiful living garden.",
  openGraph: {
    title: "VerseGarden",
    description: "Grow your own digital sanctuary with words.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-primary/30">
        {children}
      </body>
    </html>
  );
}
