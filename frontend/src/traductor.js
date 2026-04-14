import polyglotI18nProvider from 'ra-i18n-polyglot';
import { resolveBrowserLocale } from 'react-admin';
import spanishMessages from './spanishMessages';
import portugueseMessages from './portugueseMessages';
import spanishStandardMessages from '@blackbox-vision/ra-language-spanish';
import portugueseStandardMessages from 'ra-language-pt-br';

const mergeMessages = (standard, custom) => {
    return {
        ...standard,
        ...custom,
        ra: {
            ...standard.ra,
            ...custom.ra,
            notification: {
                ...standard.ra?.notification,
                ...custom.ra?.notification,
            },
        },
    };
};

const messages = {
    es: mergeMessages(spanishStandardMessages, spanishMessages),
    pt: mergeMessages(portugueseStandardMessages, portugueseMessages),
};

// Map pt-BR and others to 'pt', and anything else starting with 'es' to 'es'
const getMessages = (locale) => {
    if (locale.startsWith('pt')) return messages.pt;
    if (locale.startsWith('es')) return messages.es;
    return messages.es; // Default to Spanish
};

export const i18nProvider = polyglotI18nProvider(
    locale => getMessages(locale),
    resolveBrowserLocale(),
    [
        { locale: 'es', name: 'Español' },
        { locale: 'pt', name: 'Português' }
    ]
);
