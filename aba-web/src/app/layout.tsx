import { dir } from "i18next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import ReactQueryProvider from "@/components/ReactQueryProvider/ReactQueryProvider";
import { RootLayoutProps } from "@/shared/types/layout";
import SessionProvider from "@/components/SessionProvider/SessionProvider";

import { getServerTranslations } from "@/shared/utils/i18n/server";
import { I18nProvider } from "@/shared/utils/i18n/i18n-context";
import { ThemeContextProvider } from "@/shared/contexts/ThemeContext";
import TopMenu from "@/shared/components/TopMenu/TopMenu";
import ClientProviders from "@/shared/components/ClientProviders/ClientProviders";

export async function generateMetadata() {
  const { t } = await getServerTranslations();
  return {
    title: t("metadata_title"),
    description: t("metadata_description"),
  };
}
export default async function RootLayout({
  session,
  children,
}: RootLayoutProps) {
  const { i18n } = await getServerTranslations();
  const language = i18n.resolvedLanguage;

  return (
    <html lang={language} dir={dir(language)}>
      <head></head>
      <body>
        <ReactQueryProvider>
          <SessionProvider session={session}>
            <ClientProviders language={language || "en"}>
              <TopMenu />
              {children}
            </ClientProviders>
          </SessionProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
