import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist", "node_modules"] },
	{
		files: ["**/*.{ts,tsx}"],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		languageOptions: {
			ecmaVersion: 2022,
			globals: globals.browser,
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
			"jsx-a11y": jsxA11y,
		},
		rules: {
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
			// Accessibility issues are reported as warnings while existing pages are fixed.
			...Object.fromEntries(
				Object.entries(jsxA11y.flatConfigs.recommended.rules)
					.filter(([, level]) => (Array.isArray(level) ? level[0] : level) !== "off")
					.map(([rule]) => [rule, "warn"]),
			),
			// Errors are swallowed on purpose in a few best-effort paths (storage, parsing).
			"no-empty": ["error", { allowEmptyCatch: true }],
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
		},
	},
);
