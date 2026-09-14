import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchMetadataSystems, type MetadataSystem } from "../lib/api";

export default function MetadataSystemsView() {
	const { t } = useTranslation();
	const [systems, setSystems] = useState<MetadataSystem[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchMetadataSystems()
			.then((s) => {
				setSystems(s);
				setError(null);
			})
			.catch((e: Error) => setError(e.message));
	}, []);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("metadata.systems.title")}</h1>
				<p className="text-[var(--color-base-content)]/60 text-sm pt-2">
					{t("metadata.systems.subtitle")}
				</p>
			</div>

			<div className="flex items-center gap-2">
				<input
					type="text"
					readOnly
					placeholder={t("metadata.systems.searchPlaceholder")}
					className="input flex-1"
				/>
				<Link to="/app/metadata/games" className="btn btn-primary">
					{t("metadata.systems.searchGames")}
				</Link>
			</div>

			{error ? (
				<p className="text-sm text-[var(--color-error)] py-6 text-center">{error}</p>
			) : systems === null ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("metadata.loadingSystems")}</p>
			) : systems.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">
					{t("metadata.systems.empty")}
				</p>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
					{systems.map((s) => (
						<Link
							key={s.id}
							to={`/app/metadata/systems/${s.id}`}
							className="card card-border hover:card-hover p-4 flex flex-col items-center gap-1.5 text-center"
						>
							<span className="grid size-12 place-items-center rounded-xl bg-[var(--color-base-300)] text-[var(--color-primary)]">
								<Server className="w-6 h-6" />
							</span>
							<span className="font-medium text-xs line-clamp-2">{s.name}</span>
							<span className="text-[0.65rem] text-[var(--color-base-content)]/50 font-mono">{s.id}</span>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
