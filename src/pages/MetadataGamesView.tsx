import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cdnUrl, fetchMetadataGamesBySystem, fetchMetadataSystems, searchMetadataGames, type GameSummary, type MetadataSystem } from "../lib/api";
import { RatingBadge } from "../components/Rating";

const LIMIT = 20;

export default function MetadataGamesView() {
	const { t } = useTranslation();
	const { id } = useParams<{ id: string }>();
	const [system, setSystem] = useState<MetadataSystem | null>(null);
	const [games, setGames] = useState<GameSummary[] | null>(null);
	const [total, setTotal] = useState(0);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;
		fetchMetadataSystems()
			.then((list) => setSystem(list.find((s) => s.id === id) || null))
			.catch(() => {});
	}, [id]);

	useEffect(() => {
		if (!id) return;
		setLoading(true);
		setError(null);
		const offset = (page - 1) * LIMIT;
		const req = query.trim()
			? searchMetadataGames(query.trim(), id, LIMIT, offset)
			: fetchMetadataGamesBySystem(id, LIMIT, offset);
		req.then((data) => {
			setGames(data.games);
			setTotal(data.total);
		})
			.catch((e: Error) => setError(e.message))
			.finally(() => setLoading(false));
	}, [id, query, page]);

	const totalPages = Math.max(1, Math.ceil(total / LIMIT));

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/app/metadata/systems" className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{system?.name || t("common.games")}</h1>
				</div>
			</div>

			{system ? (
				<div className="card p-6 space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
						<div><p className="label-text">{t("metadata.games.systemId")}</p><p className="font-mono text-xs">{system.id}</p></div>
						<div><p className="label-text">{t("metadata.games.shortName")}</p><p>{system.short_name || "—"}</p></div>
						<div><p className="label-text">{t("metadata.games.region")}</p><p>{system.region || "—"}</p></div>
					</div>
					{system.description ? (
						<div><p className="label-text">{t("common.description")}</p><p className="text-sm text-[var(--color-base-content)]/70">{system.description}</p></div>
					) : null}
				</div>
			) : null}

			<div className="flex flex-col sm:flex-row gap-2 items-center">
				<div className="relative flex-1 w-full">
					<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-base-content)]/40" />
					<input
						className="input pl-9 w-full"
						placeholder={t("metadata.games.searchPlaceholder")}
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setPage(1);
						}}
					/>
				</div>
				<p className="text-sm text-[var(--color-base-content)]/50 sm:shrink-0">{t("metadata.gamesCount", { count: total })}</p>
			</div>

			{error ? (
				<p className="text-sm text-[var(--color-error)] py-6 text-center">{error}</p>
			) : loading ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("metadata.loadingGames")}</p>
			) : games && games.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("metadata.noGamesMatch")}</p>
			) : games ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
					{games.map((g) => (
						<Link key={g.id} to={`/app/metadata/games/${g.id}`} className="card card-hover p-3 flex items-center gap-3">
							{g.cover ? (
								<img src={cdnUrl(g.cover)} alt="" className="w-16 h-16 object-cover rounded-lg border border-[var(--color-base-300)] shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
							) : (
								<div className="w-16 h-16 rounded-lg bg-[var(--color-base-300)] shrink-0" />
							)}
							<div className="min-w-0 flex-1">
								<h3 className="font-semibold truncate">{g.name}</h3>
								<p className="text-xs text-[var(--color-base-content)]/50 mt-0.5">
									{g.release_year ? `${g.release_year}` : t("metadata.na")}
								</p>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<span className={`badge badge-sm uppercase ${g.type === "hack" ? "badge-solid-warning" : g.type === "homebrew" ? "badge-solid-info" : "badge-solid-neutral"}`}>
									{g.type || "base"}
								</span>
								<RatingBadge rating={g.rating} />
							</div>
						</Link>
					))}
				</div>
			) : null}

			<div className="flex items-center justify-between gap-3">
				<button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
					<ChevronLeft className="w-4 h-4" />
					{t("metadata.prev")}
				</button>
				<p className="text-sm text-[var(--color-base-content)]/50">
					{t("metadata.pageOf", { page, totalPages })}
				</p>
				<button className="btn btn-outline btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
					{t("metadata.next")}
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
