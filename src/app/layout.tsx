import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Studio - Free AI Image & Video Generator",
  description: "Generate stunning AI images and videos for free. Create beautiful artwork, animations, and visual content with cutting-edge AI technology. No signup required.",
  keywords: ["AI", "image generation", "video generation", "artificial intelligence", "free", "text to image", "text to video", "AI art", "creative AI"],
  authors: [{ name: "AI Studio" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "AI Studio - Free AI Image & Video Generator",
    description: "Generate stunning AI images and videos for free with cutting-edge AI technology.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Studio - Free AI Generator",
    description: "Generate stunning AI images and videos for free",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${syne.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
