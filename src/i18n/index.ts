import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import id from "./locales/id.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";

export const LANGUAGE_STORAGE_KEY = "ns-language";

export interface LanguageOption {
	code: string;
	label: string;
	native: string;
}

export const LANGUAGES: LanguageOption[] = [
	{ code: "en", label: "English", native: "English" },
	{ code: "de", label: "German", native: "Deutsch" },
	{ code: "es", label: "Spanish", native: "Espanol" },
	{ code: "fr", label: "French", native: "Francais" },
	{ code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
	{ code: "it", label: "Italian", native: "Italiano" },
	{ code: "ja", label: "Japanese", native: "\u65e5\u672c\u8a9e" },
	{ code: "ko", label: "Korean", native: "\ud55c\uad6d\uc5b4" },
	{ code: "pt", label: "Portuguese", native: "Portugu\u00eas" },
	{ code: "ru", label: "Russian", native: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
	{ code: "zh", label: "Chinese (Simplified)", native: "\u7b80\u4f53\u4e2d\u6587" },
];

const SUPPORTED_LANGUAGES = LANGUAGES.map((language) => language.code);

function detectLanguage(): string {
	try {
		const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
		if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;
	} catch {}
	const navigatorLanguage = typeof navigator !== "undefined" ? navigator.language : "en";
	const base = navigatorLanguage.split("-")[0];
	if (base === "zh") return "zh";
	if (SUPPORTED_LANGUAGES.includes(base)) return base;
	return "en";
}

const initialLanguage = detectLanguage();

void i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		de: { translation: de },
		es: { translation: es },
		fr: { translation: fr },
		id: { translation: id },
		it: { translation: it },
		ja: { translation: ja },
		ko: { translation: ko },
		pt: { translation: pt },
		ru: { translation: ru },
		zh: { translation: zh },
	},
	lng: initialLanguage,
	fallbackLng: "en",
	supportedLngs: SUPPORTED_LANGUAGES,
	interpolation: { escapeValue: false },
	returnNull: false,
});

if (typeof document !== "undefined") {
	document.documentElement.lang = initialLanguage;
}

i18n.on("languageChanged", (language) => {
	try {
		localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
	} catch {}
	if (typeof document !== "undefined") {
		document.documentElement.lang = language;
	}
});

export function setLanguage(language: string): void {
	if (SUPPORTED_LANGUAGES.includes(language)) {
		void i18n.changeLanguage(language);
	}
}

export default i18n;
