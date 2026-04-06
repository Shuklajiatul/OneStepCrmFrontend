import { Geist, Geist_Mono, Shantell_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import ClientLayout from "./client-layout";
import Script from "next/script";

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

import { cookies } from "next/headers";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user')?.value;
  let user = null;

  if (userCookie) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie));
    } catch (e) {
      console.warn('Failed to parse user cookie in RootLayout', e);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout initialUser={user}>{children}</ClientLayout>
        <Toaster position="top-right" expand={true} closeButton visibleToasts={6} />
        <Script id="chat-widget-config" strategy="beforeInteractive">
          {`
            window.ChatWidgetConfig = {
              flowId: "0a6afd1a-67aa-42b4-a48c-83ec44c2b356",
              serverUrl: "http://10.10.15.194:3006/api",
              title: "Chat Support",
              primaryColor: "#219175ff",
              position: "bottom-left"
            };
          `}
        </Script>
        <Script src="http://10.10.15.194:3002/chat-widget.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
