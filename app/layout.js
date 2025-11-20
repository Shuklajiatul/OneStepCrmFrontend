import { Geist, Geist_Mono, Shantell_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const shantellSans = Shantell_Sans({
  variable: "--font-shantell-sans",
  subsets: ["latin"]
})

export const metadata = {
  title: "Slash CRM ",
  description: "This is Slash Rtc CRM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        // className={shantellSans.className}
      >
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
