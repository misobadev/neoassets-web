import { useEffect, useState } from "react";
import BackLink from "../components/ui/BackLink";
import SectionTitle from "../components/ui/SectionTitle";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, Layers, Plus, Trash2, Images, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import { deletePack, fetchPackDetail, type PackDetail } from "../lib/api";
import UserLink from "../components/UserLink";
import DonateButton from "../components/DonateButton";
import Modal from "../components/ui/Modal";
import DialogHeader from "../components/ui/DialogHeader";
import { useSession } from "../lib/session";
import { usePageMeta } from "../lib/seo";
import { useSystems } from "../lib/systems";

// SapDetailPage shows a published System Art Pack: its metadata, every image and
// a Contribute button, mirroring the game metadata detail page. Browsing is
// public; contributing requires an account. Admins can also delete the whole
// pack (every version, contributions and stored images).
export default function SapDetailPage() {
	const { packID } = useParams<{ packID: string }>();
	const { t } = useTranslation();
	const [pack, setPack] = useState<PackDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const { authed: signedIn, isAdmin } = useSession();
	const navigate = useNavigate();
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const { systems } = useSystems();
	usePageMeta({
		title: pack ? `${pack.name} - ${t("nav.systemArtPack")} - NeoAssets` : `${t("nav.systemArtPack")} - NeoAssets`,
		description: pack
			? pack.description ||
				`${pack.name}, a system art pack by ${pack.author} for emulation frontends on NeoAssets.`
			: undefined,
	});

	useEffect(() => {
		if (!packID) return;
		fetchPackDetail(packID)
			.then(setPack)
			.catch((e: Error) => setError(e.message));
	}, [packID]);

	if (error) {
		return (
			<div className="space-y-4">
				<BackLink to="/app/sap" label={t("nav.systemArtPack")} className="" />
				<p className="text-sm text-[var(--color-error)]">{error}</p>
			</div>
		);
	}
	if (!pack)
		return <p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("common.loading")}</p>;

	const removePack = async () => {
		setDeleting(true);
		setDeleteError(null);
		try {
			await deletePack(pack.folder);
			navigate("/app/sap", { replace: true });
		} catch (e) {
			setDeleteError((e as Error).message);
			setDeleting(false);
		}
	};

	const systemNames = new Map(systems.map((s) => [s.id, s.name]));
	// Each image is labelled with its system (the pack's preview has none).
	const imageLabel = (f: { kind: string; system_id?: string }) =>
		f.system_id ? systemNames.get(f.system_id) || f.system_id : t("common.preview");
	// The pack preview first, then the systems in alphabetical order.
	const images = (pack.files || [])
		.filter((f) => f.kind === "background" || f.kind === "preview")
		.sort((a, b) =>
			a.kind !== b.kind ? (a.kind === "preview" ? -1 : 1) : imageLabel(a).localeCompare(imageLabel(b)),
		);

	return (
		<div className="space-y-6">
			<header className="card card-tone tone-sap px-4 py-5 sm:px-6 sm:py-6 space-y-4">
				<Palette
					className="absolute -right-6 -bottom-8 w-40 h-40 -rotate-12 text-[var(--tone)] opacity-[0.08] pointer-events-none"
					strokeWidth={1.5}
					aria-hidden="true"
				/>
				<div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="min-w-0 flex-1">
							<BackLink to="/app/sap" label={t("nav.systemArtPack")} />
							<div className="flex items-center gap-2">
								<h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{pack.name}</h1>
								<span className="badge badge-success shrink-0">v{pack.version || "?"}</span>
							</div>
							<p className="text-sm text-[var(--color-base-content)]/75 pt-1">
								{t("submissions.byAuthor", { author: pack.author })}
							</p>
						</div>
					</div>
					<div className="flex gap-2 shrink-0">
						<Link
							to={signedIn ? `/app/sap/${pack.folder}/contribute` : "/app/login"}
							state={signedIn ? undefined : { from: `/app/sap/${pack.folder}` }}
							className="btn btn-primary btn-sm flex-1 sm:flex-none"
						>
							<Plus className="w-4 h-4" />
							{t("submissions.contribute")}
						</Link>
						{isAdmin ? (
							<button
								type="button"
								className="btn btn-error btn-sm flex-1 sm:flex-none"
								onClick={() => {
									setDeleteError(null);
									setConfirmDelete(true);
								}}
							>
								<Trash2 className="w-4 h-4" />
								{t("common.delete")}
							</button>
						) : null}
					</div>
				</div>

				<div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--color-base-content)]/65 pt-3 border-t border-[var(--color-base-300)]">
					<span className="flex items-center gap-1.5">
						<Download className="w-4 h-4 text-[var(--tone)]" />
						<span className="font-display font-semibold text-[var(--color-base-content)]">
							{(pack.downloads || 0).toLocaleString()}
						</span>
						{t("submissions.downloadsShort")}
					</span>
					<span className="flex items-center gap-1.5">
						<Layers className="w-4 h-4 text-[var(--tone)]" />
						<span className="font-display font-semibold text-[var(--color-base-content)]">
							{pack.systems_covered || 0}
						</span>
						{t("submissions.systemsShort")}
					</span>
					{pack.submitted_by ? (
						<span>
							{t("submissions.submittedBy")} <UserLink>{pack.submitted_by}</UserLink>
						</span>
					) : null}
					<span className="sm:ml-auto">
						<DonateButton url={pack.donation_url} author={pack.author} />
					</span>
				</div>
				{pack.description ? (
					<p className="relative text-sm leading-6 text-[var(--color-base-content)]/75 whitespace-pre-wrap">
						{pack.description}
					</p>
				) : null}
			</header>

			<section className="card p-4 sm:p-6 tone-sap">
				<SectionTitle icon={Images}>
					{t("submissions.gallery")}{" "}
					<span className="font-normal text-sm text-[var(--color-base-content)]/50">({images.length})</span>
				</SectionTitle>
				{images.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/50">{t("submissions.noImages")}</p>
				) : (
					<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-2">
						{images.map((f) => (
							<figure key={f.object_key} className="min-w-0">
								<img
									src={f.url}
									alt={imageLabel(f)}
									loading="lazy"
									className="w-full aspect-square object-cover rounded-md border border-[var(--color-base-300)] bg-[var(--color-base-300)]/30 transition-transform hover:scale-[1.04]"
									onError={(e) => (e.currentTarget.style.visibility = "hidden")}
								/>
								<figcaption
									className="mt-1 text-[11px] text-[var(--color-base-content)]/65 truncate"
									title={imageLabel(f)}
								>
									{imageLabel(f)}
								</figcaption>
							</figure>
						))}
					</div>
				)}
			</section>

			{confirmDelete ? (
				<Modal onClose={deleting ? undefined : () => setConfirmDelete(false)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<DialogHeader tone="error" icon={Trash2} title={t("submissions.deletePackTitle")}>
							{t("submissions.deletePackBody", { name: pack.name })}
						</DialogHeader>
						{deleteError ? <p className="text-sm text-[var(--color-error)]">{deleteError}</p> : null}
						<div className="flex justify-end gap-2">
							<button
								className="btn btn-ghost"
								type="button"
								disabled={deleting}
								onClick={() => setConfirmDelete(false)}
							>
								{t("common.cancel")}
							</button>
							<button className="btn btn-danger" type="button" disabled={deleting} onClick={removePack}>
								<Trash2 className="w-4 h-4" />
								{deleting ? t("submissions.deletingPack") : t("submissions.deletePack")}
							</button>
						</div>
					</div>
				</Modal>
			) : null}
		</div>
	);
}
