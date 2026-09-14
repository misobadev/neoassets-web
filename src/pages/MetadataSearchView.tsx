import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchMetadataSystems, lookupMetadataGames, searchMetadataGames, type GameSummary, type MetadataSystem } from "../lib/api";
import { RatingBadge } from "../components/Rating";

export default function MetadataSearchView() {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [hash, setHash] = useState("");
	const [systemId, setSystemId] = useState("");
	const [systems, setSystems] = useState<MetadataSystem[]>([]);
	const [results, setResults] = useState<GameSummary[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searched, setSearched] = useState(false);

	useEffect(() => {
		fetchMetadataSystems()
			.then((s) => setSystems(s))
			.catch(() => {});
	}, []);

	function doSearch() {
		setLoading(true);
		setError(null);
		const trimmed = query.trim();
		const h = hash.trim();
		const req = trimmed || h
			? trimmed
				? searchMetadataGames(trimmed, systemId).then((r) => r.games)
				: lookupMetadataGames({ crc: h, md5: h, sha1: h, sha256: h })
			: systemId
				? searchMetadataGames("", systemId).then((r) => r.games)
				: Promise.resolve<GameSummary[]>([]);
		req.then((games) => {
			setResults(games);
			setSearched(true);
		})
			.catch((e: Error) => setError(e.message))
			.finally(() => setLoading(false));
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("metadata.search.title")}</h1>
				<p className="text-[var(--color-base-content)]/60 text-sm pt-2">
					{t("metadata.search.subtitle")}
				</p>
			</div>

			<div className="card p-6 space-y-4">
				<div>
					<label className="label-text">{t("metadata.search.gameName")}</label>
					<div className="flex flex-col sm:flex-row gap-2">
						<input
							className="input flex-1"
							placeholder={t("metadata.search.gameNamePlaceholder")}
							value={query}
							onChange={(e) => { setQuery(e.target.value); setHash(""); }}
							onKeyDown={(e) => e.key === "Enter" && doSearch()}
						/>
						<select
							className="input sm:max-w-[16rem]"
							value={systemId}
							onChange={(e) => setSystemId(e.target.value)}
						>
							<option value="">{t("metadata.allSystems")}</option>
							{systems.map((s) => (
								<option key={s.id} value={s.id}>{s.name}</option>
							))}
						</select>
						<button
							className="btn btn-primary"
							onClick={doSearch}
							disabled={loading || (!query.trim() && !hash.trim() && !systemId)}
						>
							<Search className="w-4 h-4" />
							{t("common.search")}
						</button>
					</div>
				</div>
				<div>
					<label className="label-text">{t("metadata.search.hashLabel")}</label>
					<input
						className="input"
						placeholder={t("metadata.search.hashPlaceholder")}
						value={hash}
						onChange={(e) => { setHash(e.target.value); setQuery(""); }}
						onKeyDown={(e) => e.key === "Enter" && doSearch()}
					/>
				</div>
			</div>

			{error ? (
				<p className="text-sm text-[var(--color-error)] text-center">{error}</p>
			) : loading ? (
				<p className="text-sm text-[var(--color-base-content)]/50 text-center py-4">{t("metadata.search.searching")}</p>
			) : searched && results && results.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50 text-center py-4">{t("metadata.search.noGames")}</p>
			) : results && results.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{results.map((g) => (
						<Link key={g.id} to={`/app/metadata/games/${g.id}`} className="card card-hover p-4">
							<div className="flex items-center justify-between gap-2">
								<h3 className="font-semibold truncate min-w-0">{g.name}</h3>
								<RatingBadge rating={g.rating} />
							</div>
							<p className="text-xs text-[var(--color-base-content)]/50 mt-0.5">
								{g.system_name} {g.region ? `· ${g.region}` : ""}
							</p>
						</Link>
					))}
				</div>
			) : null}
		</div>
	);
}
