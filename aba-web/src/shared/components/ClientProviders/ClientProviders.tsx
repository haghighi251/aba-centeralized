'use client';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { I18nProvider } from '@/shared/utils/i18n/i18n-context';
import { ThemeContextProvider } from '@/shared/contexts/ThemeContext';
import { CsrfProvider } from '@/shared/contexts/CsrfContext';

export default function ClientProviders({ children, language }: { children: React.ReactNode; language: string }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <I18nProvider language={language}>
        <ThemeContextProvider>
          <CsrfProvider>
            {children}
          </CsrfProvider>
        </ThemeContextProvider>
      </I18nProvider>
    </AppRouterCacheProvider>
  );
}