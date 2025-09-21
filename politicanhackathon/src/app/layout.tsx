import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AGORA - Political Literacy App",
  description: "Nonpartisan, citation-first political literacy app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-3">
                <Image 
                  src="/cropped.png" 
                  alt="AGORA Logo" 
                  width={40} 
                  height={40}
                  className="object-contain"
                />
                <span className="text-xl font-bold text-gray-900">
                  AGORA
                </span>
              </Link>
                  <div className="flex space-x-6">
                    <Link href="/map" className="text-gray-600 hover:text-gray-900">
                      Map
                    </Link>
                    <Link href="/bills" className="text-gray-600 hover:text-gray-900">
                      Bills
                    </Link>
                    <Link href="/analytics" className="text-gray-600 hover:text-gray-900">
                      Analytics
                    </Link>
                    <Link href="/political-qa" className="text-gray-600 hover:text-gray-900">
                      Q&A
                    </Link>
                    <Link href="/political-debate" className="text-gray-600 hover:text-gray-900">
                      Debate
                    </Link>
                  </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
