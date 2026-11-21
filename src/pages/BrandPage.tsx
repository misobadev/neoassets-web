import { useState } from "react";
import { Check, Copy, Download, Shapes } from "lucide-react";
import PageTitle from "../components/ui/PageTitle";
import { useTranslation } from "react-i18next";
import { Isotype, Wordmark } from "../components/Brand";
import isotypeUrl from "../assets/neoassets-isotype.svg";
import { usePageMeta } from "../lib/seo";

// Downloadable brand files, served from public/brand.
const FILES = [
	{ key: "logoDark", svg: "/brand/neoassets-logo-dark.svg", png: "/brand/neoassets-logo-dark.png" },
	{ key: "logoLight", svg: "/brand/neoassets-logo-light.svg", png: "/brand/neoassets-logo-light.png" },
	{ key: "logoWhite", svg: "/brand/neoassets-logo-white.svg", png: "/brand/neoassets-logo-white.png" },
	{ key: "logoBlack", svg: "/brand/neoassets-logo-black.svg", png: "/brand/neoassets-logo-black.png" },
	{ key: "isotype", svg: "/brand/neoassets-isotype.svg", png: "/brand/neoassets-isotype-512.png" },
	{ key: "isotypeWhite", svg: "/brand/neoassets-isotype-white.svg", png: "/brand/neoassets-isotype-white-512.png" },
	{ key: "isotypeBlack", svg: "/brand/neoassets-isotype-black.svg", png: "/brand/neoassets-isotype-black-512.png" },
] as const;

// The palette as it ships in the dark theme (src/index.css holds the light
// theme values too).
const COLORS = [
	{ group: "brand", name: "primary", hex: "#22c5e8" },
	{ group: "brand", name: "primarySoft", hex: "#6fe3f5" },
	{ group: "brand", name: "cubeTop", hex: "#7ff0ff" },
	{ group: "brand", name: "cubeLeft", hex: "#14a8cc" },
	{ group: "brand", name: "cubeRight", hex: "#e25bd0" },
	{ group: "sections", name: "meta", hex: "#4fd8f0" },
	{ group: "sections", name: "sap", hex: "#f07ad8" },
	{ group: "sections", name: "reward", hex: "#ffd166" },
	{ group: "sections", name: "community", hex: "#5be3a3" },
	{ group: "sections", name: "system", hex: "#a99bff" },
	{ group: "sections", name: "storage", hex: "#9db4cc" },
	{ group: "neutrals", name: "background", hex: "#0b1016" },
	{ group: "neutrals", name: "surface", hex: "#121a23" },
	{ group: "neutrals", name: "border", hex: "#22303e" },
	{ group: "neutrals", name: "text", hex: "#e6eaf0" },
] as const;

const GROUPS = ["brand", "sections", "neutrals"] as const;

// BrandPage is the public brand kit: the logo and isotype with downloads, the
// palette (click a swatch to copy its value), the typefaces and the usage rules.
export default function BrandPage() {
	const { t } = useTranslation();
	usePageMeta({
		title: "Brand kit - NeoAssets",
		description: "NeoAssets logo, isotype, colors and typefaces, ready to download.",
	});
	const [copied, setCopied] = useState<string | null>(null);

	const copy = (hex: string) => {
		navigator.clipboard
			?.writeText(hex)
			.then(() => {
				setCopied(hex);
				setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1500);
			})
			.catch(() => {});
	};

	return (
		<div className="space-y-12">
			<header>
				<PageTitle icon={Shapes} tone="tone-primary">
					{t("brand.title")}
				</PageTitle>
				<p className="text-[var(--color-base-content)]/70 mt-2 max-w-prose">{t("brand.subtitle")}</p>
			</header>

			{/* Logo and isotype */}
			<section aria-labelledby="brand-logo" className="space-y-5">
				<h2 id="brand-logo" className="text-xl font-semibold">
					{t("brand.logo.title")}
				</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="card grid place-items-center p-10 bg-[#0b1016]">
						<img
							src="/brand/neoassets-logo-dark.svg"
							alt={t("brand.files.logoDark")}
							className="w-full max-w-sm"
						/>
					</div>
					<div className="card grid place-items-center p-10 !bg-[#f4f6f9] !border-[#dbe1e9]">
						<img
							src="/brand/neoassets-logo-light.svg"
							alt={t("brand.files.logoLight")}
							className="w-full max-w-sm"
						/>
					</div>
				</div>
				{/* Single-color versions, for photos, print and one-color uses. */}
				<div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
					<div className="card grid place-items-center p-6 !bg-[#1b2430]">
						<img
							src="/brand/neoassets-logo-white.svg"
							alt={t("brand.files.logoWhite")}
							className="w-full"
						/>
					</div>
					<div className="card grid place-items-center p-6 !bg-white !border-[#dbe1e9]">
						<img
							src="/brand/neoassets-logo-black.svg"
							alt={t("brand.files.logoBlack")}
							className="w-full"
						/>
					</div>
					<div className="card grid place-items-center p-6 !bg-[#1b2430]">
						<img
							src="/brand/neoassets-isotype-white.svg"
							alt={t("brand.files.isotypeWhite")}
							className="h-16 w-16"
						/>
					</div>
					<div className="card grid place-items-center p-6 !bg-white !border-[#dbe1e9]">
						<img
							src="/brand/neoassets-isotype-black.svg"
							alt={t("brand.files.isotypeBlack")}
							className="h-16 w-16"
						/>
					</div>
				</div>
				<div className="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)] items-start">
					<div className="card grid place-items-center p-8">
						<Isotype className="h-32 w-32" />
					</div>
					<div className="space-y-3">
						<h3 className="font-semibold">{t("brand.logo.isotypeTitle")}</h3>
						<p className="text-sm leading-6 text-[var(--color-base-content)]/70 max-w-prose">
							{t("brand.logo.isotypeBody")}
						</p>
						<div className="flex items-end gap-4 pt-2" aria-hidden="true">
							{[48, 32, 24, 16].map((s) => (
								<div key={s} className="flex flex-col items-center gap-1">
									<img src={isotypeUrl} alt="" style={{ width: s, height: s }} />
									<span className="font-mono text-[11px] text-[var(--color-base-content)]/50">
										{s}px
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Downloads */}
			<section aria-labelledby="brand-files" className="space-y-4">
				<h2 id="brand-files" className="text-xl font-semibold">
					{t("brand.files.title")}
				</h2>
				<ul className="card divide-y divide-[var(--color-base-300)]">
					{FILES.map((f) => (
						<li key={f.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
							<span className="flex-1 min-w-[12rem] text-sm font-medium">
								{t(`brand.files.${f.key}`)}
							</span>
							<a href={f.svg} download className="btn btn-secondary btn-sm">
								<Download className="w-4 h-4" aria-hidden="true" />
								SVG
							</a>
							{"png" in f ? (
								<a href={f.png} download className="btn btn-secondary btn-sm">
									<Download className="w-4 h-4" aria-hidden="true" />
									PNG
								</a>
							) : null}
						</li>
					))}
				</ul>
			</section>

			{/* Colors */}
			<section aria-labelledby="brand-colors" className="space-y-6">
				<div>
					<h2 id="brand-colors" className="text-xl font-semibold">
						{t("brand.colors.title")}
					</h2>
					<p className="text-sm text-[var(--color-base-content)]/65 mt-1">{t("brand.colors.hint")}</p>
				</div>
				{GROUPS.map((g) => (
					<div key={g} className="space-y-3">
						<h3 className="text-sm font-semibold text-[var(--color-base-content)]/80">
							{t(`brand.colors.groups.${g}`)}
						</h3>
						<ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
							{COLORS.filter((c) => c.group === g).map((c) => (
								<li key={c.name}>
									<button
										type="button"
										onClick={() => copy(c.hex)}
										className="card card-hover w-full overflow-hidden text-left"
										aria-label={t("brand.colors.copy", { value: c.hex })}
									>
										<span className="block h-16" style={{ backgroundColor: c.hex }} />
										<span className="flex items-center justify-between gap-2 p-3">
											<span className="min-w-0">
												<span className="block text-sm font-medium truncate">
													{t(`brand.colors.names.${c.name}`)}
												</span>
												<span className="block font-mono text-xs text-[var(--color-base-content)]/60">
													{c.hex}
												</span>
											</span>
											{copied === c.hex ? (
												<Check className="w-4 h-4 text-[var(--color-success)] shrink-0" />
											) : (
												<Copy className="w-4 h-4 text-[var(--color-base-content)]/40 shrink-0" />
											)}
										</span>
									</button>
								</li>
							))}
						</ul>
					</div>
				))}
			</section>

			{/* Typography */}
			<section aria-labelledby="brand-type" className="space-y-4">
				<h2 id="brand-type" className="text-xl font-semibold">
					{t("brand.type.title")}
				</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="card p-5 space-y-2">
						<Wordmark className="text-3xl" />
						<p className="text-sm font-medium">Anta</p>
						<p className="text-xs text-[var(--color-base-content)]/60">{t("brand.type.anta")}</p>
					</div>
					<div className="card p-5 space-y-2">
						<p className="font-display text-3xl font-semibold leading-none">Aa 25,360</p>
						<p className="text-sm font-medium">Oxanium</p>
						<p className="text-xs text-[var(--color-base-content)]/60">{t("brand.type.display")}</p>
					</div>
					<div className="card p-5 space-y-2">
						<p className="text-3xl font-medium leading-none">Aa Bb 123</p>
						<p className="text-sm font-medium">Barlow</p>
						<p className="text-xs text-[var(--color-base-content)]/60">{t("brand.type.sans")}</p>
					</div>
					<div className="card p-5 space-y-2">
						<p className="text-3xl font-mono leading-none">a1b2c3</p>
						<p className="text-sm font-medium">IBM Plex Mono</p>
						<p className="text-xs text-[var(--color-base-content)]/60">{t("brand.type.mono")}</p>
					</div>
				</div>
			</section>

			{/* Usage */}
			<section aria-labelledby="brand-usage" className="space-y-4">
				<h2 id="brand-usage" className="text-xl font-semibold">
					{t("brand.usage.title")}
				</h2>
				<ul className="grid gap-2 sm:grid-cols-2 text-sm">
					{(["space", "background", "colors", "shape"] as const).map((k) => (
						<li key={k} className="card p-4 leading-6 text-[var(--color-base-content)]/80">
							{t(`brand.usage.${k}`)}
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
