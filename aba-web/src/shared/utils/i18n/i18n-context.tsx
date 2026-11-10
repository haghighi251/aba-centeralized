'use client';
import React, { useMemo } from 'react';

import { I18nextProvider as Provider } from 'react-i18next';

import i18next from './i18n';

export function I18nProvider({
    children,
    language,
}: {
    children: React.ReactNode;
    language?: string;
}) {
    useMemo(() => {
        i18next.changeLanguage(language);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <Provider i18n={i18next}>{children}</Provider>;
}
