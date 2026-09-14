import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, setLanguage } from "../i18n";

export default function LanguageSelect({ collapsed = false }: { collapsed?: boolean }) {
	const { t, i18n } = useTranslation();
	const current = i18n.resolvedLanguage || i18n.language || "en";
	if (collapsed) {
		return (
			<label className="sap-lang" title={t("common.language")}>
				<Globe className="w-4 h-4 shrink-0" />
				<select
					value={current}
					onChange={(event) => setLanguage(event.target.value)}
					aria-label={t("common.language")}
					className="sap-lang-select"
				>
					{LANGUAGES.map((language) => (
						<option key={language.code} value={language.code}>
							{language.native}
						</option>
					))}
				</select>
			</label>
		);
	}
	return (
		<label className="sap-lang" title={t("common.language")}>
			<Globe className="w-4 h-4 shrink-0" />
			<select
				value={current}
				onChange={(event) => setLanguage(event.target.value)}
				aria-label={t("common.language")}
				className="sap-lang-native"
			>
				{LANGUAGES.map((language) => (
					<option key={language.code} value={language.code}>
						{language.native}
					</option>
				))}
			</select>
		</label>
	);
}
