import { cache } from 'react';
import 'server-only';

import acceptLanguage from 'accept-language';
import { createInstance } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { cookies as getCookies, headers as getHeaders } from 'next/headers';
import { initReactI18next } from 'react-i18next/initReactI18next';

import { cookieName, defaultNS, fallbackLng, getOptions, languages } from './settings';

const initServerI18next = async (language: string, ns: string = defaultNS) => {
    const i18nInstance = createInstance();
    await i18nInstance
        .use(initReactI18next)
        .use(
            resourcesToBackend(
                (language: string, ns: string) =>
                    import(
                        `../../infrastructures/locales/${language}/${ns}.json`
                    ),
            ),
        )
        .init(getOptions(language, ns));
    return i18nInstance;
};

acceptLanguage.languages(languages);

export const getServerTranslations = cache(
    async (ns?: string, options: { keyPrefix?: string } = {}) => {
        const language = detectLanguage();
        const i18nextInstance = await initServerI18next(language, ns);
        return {
            t: i18nextInstance.getFixedT(
                language,
                Array.isArray(ns) ? ns[0] : ns,
                options.keyPrefix,
            ),
            i18n: i18nextInstance,
        };
    },
);

const detectLanguage = () => {
    const cookies = getCookies();
    const headers = getHeaders();

    let language;

    if (typeof window !== 'undefined') {
        // Only execute this code in the browser environment
        if (!language && localStorage.getItem('i18nextLng')) {
            language = localStorage.getItem('i18nextLng');
        }
    }

    if (!language && cookies.has(cookieName)) {
        language = acceptLanguage.get(cookies.get(cookieName)?.value);
    }

    if (!language) {
        language = acceptLanguage.get(headers.get('Accept-Language'));
    }

    if (!language) {
        language = fallbackLng;
    }

    return language;
};
export default detectLanguage;
