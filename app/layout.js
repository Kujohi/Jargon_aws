import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Provider from "./provider";
import Navigation from "./components/Navigation";
import ChatBubble from "@/components/ChatBubble";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Jargon AI Dashboard",
  description: "Your comprehensive financial management platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <Provider>
          <Navigation />
          {children}
          <ChatBubble />
          <Toaster />
        </Provider>
      </body>
    </html>
  );
}
