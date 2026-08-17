import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en';
import id from './locales/id';

const deviceLocale = getLocales()[0]?.languageCode ?? 'id';
const supportedLocale = ['en', 'id'].includes(deviceLocale) ? deviceLocale : 'id';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: { en: { translation: en }, id: { translation: id } },
    lng: supportedLocale,
    fallbackLng: 'id',
    interpolation: { escapeValue: false },
  });

export default i18n;
// ponytail: no async loading, no namespace splitting — add when locale files exceed ~500 keys
