import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

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

// English is bundled (it is the fallback); every other language is a separate
// chunk loaded on demand, so a visitor only downloads the language they use.
const loaders = import.meta.glob<{ default: Record<string, unknown> }>(["./locales/*.json", "!./locales/en.json"]);

async function loadLanguage(language: string): Promise<void> {
	if (language === "en" || i18n.hasResourceBundle(language, "translation")) return;
	const load = loaders[`./locales/${language}.json`];
	if (!load) return;
	const mod = await load();
	i18n.addResourceBundle(language, "translation", mod.default, true, true);
}

const initialized = i18n.use(initReactI18next).init({
	resources: { en: { translation: en } },
	partialBundledLanguages: true,
	lng: initialLanguage,
	fallbackLng: "en",
	supportedLngs: SUPPORTED_LANGUAGES,
	interpolation: { escapeValue: false },
	returnNull: false,
});

// i18nReady resolves once the visitor's language is loaded; main renders the
// app after it, so a non-English visitor never sees English text first.
export const i18nReady: Promise<void> = Promise.all([initialized, loadLanguage(initialLanguage)])
	.then(() => i18n.changeLanguage(initialLanguage))
	.then(() => undefined)
	.catch(() => undefined);

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
		void loadLanguage(language).then(() => i18n.changeLanguage(language));
	}
}

export default i18n;
