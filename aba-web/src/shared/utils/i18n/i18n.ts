'use client';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

import { getOptions } from './settings';

i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .use(
        resourcesToBackend(
            (language: string, namespace: string) =>
                import(
                    `../../infrastructures/locales/${language}/${namespace}.json`
                ),
        ),
    )
    .init({
        ...getOptions(),
        detection: {
            caches: ['cookie', 'localStorage'],
            order: ['cookie', 'localStorage'],
        },
    });

export default i18next;
