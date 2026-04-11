import polyglotI18nProvider from 'ra-i18n-polyglot';
import spanishMessages from './spanishMessages';

const messages = {
    en: spanishMessages,
};
export const i18nProvider = polyglotI18nProvider(locale => messages[locale]);
