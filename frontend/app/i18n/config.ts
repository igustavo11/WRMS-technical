import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

const savedLang =
	typeof window !== 'undefined'
		? (localStorage.getItem('wrms_lang') ?? 'pt-BR')
		: 'pt-BR';

i18n.use(initReactI18next).init({
	resources: {
		'pt-BR': { translation: ptBR },
		en: { translation: en },
	},
	lng: savedLang,
	fallbackLng: 'pt-BR',
	interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lang) => {
	if (typeof window !== 'undefined') {
		localStorage.setItem('wrms_lang', lang);
	}
});

export default i18n;
