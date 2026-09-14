/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_ASSETS_API_URL?: string;
	readonly VITE_CDN_BASE?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}