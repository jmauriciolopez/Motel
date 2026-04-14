import polyglotI18nProvider from 'ra-i18n-polyglot';
import { resolveBrowserLocale } from 'react-admin';
import spanishMessages from './spanishMessages';
import portugueseMessages from './portugueseMessages';

const messages = {
    es: spanishMessages,
    pt: portugueseMessages,
};

export const i18nProvider = polyglotI18nProvider(
    locale => {
        if (locale.startsWith('pt')) return messages.pt;
        if (locale.startsWith('es')) return messages.es;
        return messages.es;
    },
    resolveBrowserLocale(),
    [
        { locale: 'es', name: 'Español' },
        { locale: 'pt', name: 'Português' }
    ]
);
