import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { userToken } from "../lib/api";
import { usePageTitle } from "../lib/seo";

// HomeView is the in-app landing: the "Contribute to the NeoAssets ecosystem"
// hero, shown to everyone (guests included) inside the app shell.
export default function HomeView() {
	const signedIn = !!userToken();
	const { t } = useTranslation();
	usePageTitle("NeoAssets - System Art Packs & Game Metadata");

	return (
		<div className="relative overflow-hidden">
			<div className="max-w-5xl mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24 text-center">
				<h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-up">
					{t("home.title")} <span className="text-gradient">{t("home.titleHighlight")}</span>
				</h1>
				<p className="text-lg md:text-xl text-[var(--color-base-content)]/60 max-w-2xl mx-auto mb-6 animate-fade-up">
					{t("home.subtitle")}
				</p>
				<p className="text-sm md:text-base text-[var(--color-base-content)]/60 max-w-2xl mx-auto mb-2 animate-fade-up flex flex-wrap items-center justify-center gap-2">
					<span className="badge badge-ghost badge-sm">{t("home.free")}</span>
					<span className="badge badge-ghost badge-sm">{t("home.noSubmissionsLimit")}</span>
					<span className="badge badge-ghost badge-sm">{t("home.fasterScraper")}</span>
				</p>
				<p className="text-sm text-[var(--color-base-content)]/50 max-w-2xl mx-auto mb-8 animate-fade-up">
					{t("home.freeNote")}
				</p>
				<div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4 animate-fade-up">
					{signedIn ? (
						<>
							<Link to="/app/sap" className="btn btn-primary btn-lg">
								{t("home.systemArtPack")}
							</Link>
							<Link to="/app/metadata" className="btn btn-outline btn-lg">
								{t("home.gameMetadata")}
							</Link>
						</>
					) : (
						<>
							<Link to="/app/register" className="btn btn-primary btn-lg">
								{t("home.createAccount")}
							</Link>
							<Link to="/app/login" className="btn btn-outline btn-lg">
								{t("home.signIn")}
							</Link>
						</>
					)}
				</div>
				<div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up">
					<a href="https://ko-fi.com/neostation" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
						<Heart className="w-4 h-4" />
						{t("home.supportKofi")}
					</a>
					<a href="https://www.patreon.com/cw/NeoAssets" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
						<Heart className="w-4 h-4" />
						{t("home.becomePatron")}
					</a>
				</div>
			</div>
		</div>
	);
}