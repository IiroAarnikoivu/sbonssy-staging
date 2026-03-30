import Chat from "@/components/Chatbot";
import ClientLayout from "@/components/ClientLayout/ClientLayout";
import CookieHubConsent from "@/components/CookieHubConsent";
import MixpanelTracker from "@/components/MixpanelTracker";
import { SocketProvider } from "@/context/SocketContext";

import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { i18n, loadMessages } from "../i18n";
import "./globals.css";
import ScrollToTop from "@/components/ScrollToTop";
import YupLocaleProvider from "@/components/YupLocaleProvider";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({ params }) {
  const locale = i18n.defaultLocale;
  const messages = await loadMessages(locale);

  const siteUrl = process.env.NEXTAUTH_URL || "https://sbonssy.com";

  return {
    title: messages.Home?.title || "Sbonssy | Empower Your Passion for Sports",
    description:
      messages.Home?.description ||
      "Shop exclusive deals that directly support sport ambassadors — from athletes and coaches to teams and creators. Join the movement and make an impact with every purchase.",
    openGraph: {
      title:
        messages.Home?.title || "Sbonssy | Empower Your Passion for Sports",
      description:
        messages.Home?.description ||
        "Shop exclusive deals that directly support sport ambassadors — from athletes and coaches to teams and creators. Join the movement and make an impact with every purchase.",
      url: siteUrl,
      siteName: "Sbonssy",
      images: [
        {
          url: `${siteUrl}/assets/logo/OGlogo.png`,
          width: 1200,
          height: 630,
          alt: "Sbonssy Logo",
        },
      ],
      locale: locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title:
        messages.Home?.title || "Sbonssy | Empower Your Passion for Sports",
      description:
        messages.Home?.description ||
        "Shop exclusive deals that directly support sport ambassadors — from athletes and coaches to teams and creators. Join the movement and make an impact with every purchase.",
      images: [`${siteUrl}/assets/logo/OGlogo.png`],
    },
  };
}

export default async function RootLayout({ children, params }) {
  // const locale = params?.locale || i18n.defaultLocale;
  const locale = await getLocale();

  // try {
  //   if (locale === "fi") {
  //     yup.setLocale(es);
  //   }
  //   // Add other locale configurations as needed
  // } catch (error) {
  //   console.error("Failed to set yup locale:", error);
  // }

  const messages = await loadMessages(locale);

  return (
    <html lang={locale}>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, 
minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        {/* PWA removed: manifest and iOS meta tags deleted */}
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CookieHubConsent />
          <YupLocaleProvider />
          <SocketProvider>
            <ClientLayout>
              <MixpanelTracker />
              <ScrollToTop />
              {children}
            </ClientLayout>
            <Chat />
          </SocketProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
