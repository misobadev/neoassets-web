import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, Loader2, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api, cdnUrl, isAdmin, type PackDetail, type SubmissionDetail, type Submission, type SubmissionLog, type SubmissionStatus, userToken } from "../lib/api";
import { formatDate } from "../lib/format";
import { useSystems } from "../lib/systems";
import { uploadWithProgress } from "../lib/upload";
import { clearPackDraft, loadPackDraft, savePackDraft } from "../lib/draft";
import UserLink from "./UserLink";

interface EditorFile {
	fileName: string;
	kind: string;
	systemId: string;
	size: number;
	mimeType: string;
	objectKey?: string;
	createdAt?: string;
	reason?: string;
	registered?: boolean;
	isNew?: boolean;
	blob?: File;
}

const STATUS_BADGE: Record<string, string> = {
	created: "badge-info",
	pending: "badge-warning",
	approved: "badge-success",
	rejected: "badge-error",
	trashed: "badge-ghost",
};

// GIFs are stored as-is (animation preserved) and must not exceed 5 MB.
const MAX_GIF_BYTES = 5 * 1024 * 1024;

// isStagedObjectKey reports whether an object key is a staged submission upload
// (review/uploads) or a preserved rejected file, i.e. one this draft owns and
// can remove. Canonical published objects (backgrounds/, logos/, preview,
// theme) are never removed from the live pack.
function isStagedObjectKey(objectKey?: string): boolean {
	if (!objectKey) return false;
	return objectKey.includes("/review/") || objectKey.includes("/uploads/") || objectKey.startsWith("rejected/");
}

const statusColor = (tone: string) =>
	({ info: "text-[var(--color-info)]", success: "text-[var(--color-success)]", error: "text-[var(--color-error)]", warning: "text-[var(--color-warning)]" })[tone] || "text-[var(--color-info)]";

// FileThumb renders either a local blob preview (newly added, object URL) or a
// remote CDN image (already uploaded). Revokes the object URL on cleanup.
function FileThumb({ blob, src }: { blob?: Blob; src?: string }) {
	const [url, setUrl] = useState<string | null>(null);
	useEffect(() => {
		if (blob) {
			const u = URL.createObjectURL(blob);
			setUrl(u);
			return () => URL.revokeObjectURL(u);
		}
		setUrl(src || null);
	}, [blob, src]);
	if (!url) return null;
	return <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />;
}

export default function SubmissionEditor({ basePack }: { basePack?: PackDetail }) {
	const { t } = useTranslation();
	const { id } = useParams();
	const navigate = useNavigate();
	const isContribution = !!basePack;

	const [subId, setSubId] = useState<string | null>(id ?? null);
	const [packID, setPackID] = useState<string>("");
	const [status, setStatus] = useState<{ text: string; tone: string } | null>(null);
	const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
	const [loaded, setLoaded] = useState(!id);

	const [name, setName] = useState("");
	const [author, setAuthor] = useState("");
	const [description, setDescription] = useState("");
	const [donationUrl, setDonationUrl] = useState("");
	const [ai, setAi] = useState(false);
	const [files, setFiles] = useState<EditorFile[]>([]);
	const [logs, setLogs] = useState<SubmissionLog[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [confirmTrash, setConfirmTrash] = useState(false);
	const [confirmSubmit, setConfirmSubmit] = useState(false);
	const [confirmAdminDelete, setConfirmAdminDelete] = useState(false);
	const [adminDeleteBusy, setAdminDeleteBusy] = useState(false);
	const [replaceDraft, setReplaceDraft] = useState<{ out: File; systemId: string } | null>(null);
	const [replaceReason, setReplaceReason] = useState("");
	const [progress, setProgress] = useState<{ active: boolean; label: string; percent: number | null }>({
		active: false,
		label: "",
		percent: null,
	});

	const { systems, loading: systemsLoading, error: systemsError, reload: reloadSystems } = useSystems();

	const addFileInputRef = useRef<HTMLInputElement>(null);
	const addToSystemRef = useRef<string>("");

	const editable = submissionStatus === null || submissionStatus === "created" || submissionStatus === "rejected";

	const draftKey = subId ? `pack-${subId}` : isContribution ? `contribution-${basePack?.folder}` : "current";

	// Load an existing submission (pending/approved/rejected) for viewing, or
	// restore a client-side draft when creating a new one. When editing an
	// existing pack, a local overlay (new images added after a rejection) is
	// merged on top of the server files.
	useEffect(() => {
		if (!id) {
			const key = isContribution ? `contribution-${basePack?.folder}` : "current";
			loadPackDraft(key)
				.then((d) => {
					if (isContribution && basePack) {
						// Contribution: identity comes from the pack; only the
						// description and images are contributed. Seed the grid
						// with the pack's already-published images so the user
						// can see what exists before adding/replacing.
						setName(basePack.name);
						setAuthor(basePack.author);
						setDonationUrl(basePack.donation_url);
						setAi(basePack.ai);
						setDescription(d?.description ?? basePack.description);
						const base: EditorFile[] = (basePack.files || [])
							.filter((f) => f.kind === "background" || f.kind === "preview" || f.kind === "logo")
							.map((f) => ({
								fileName: f.file_name,
								kind: f.kind,
								systemId: f.system_id || "",
								size: f.size || 0,
								mimeType: f.mime || "image/webp",
								objectKey: f.object_key,
								registered: true,
								isNew: false,
							}));
						// Overlay any local draft images (new ones added before a
						// reload) on top, replacing by (kind, systemId). Only
						// files that still carry a local blob are genuinely
						// new; the pack's published images (no blob) stay
						// marked as already uploaded.
						for (const of of d?.files || []) {
							if (!of.blob) continue;
							const idx = base.findIndex((b) => b.kind === of.kind && b.systemId === of.systemId);
							const entry = { ...of, isNew: true } as EditorFile;
							if (idx >= 0) base[idx] = entry;
							else base.push(entry);
						}
						setFiles(base);
					} else {
						if (d && d.name) setName(d.name);
						if (d && d.author) setAuthor(d.author);
						if (d && d.description) setDescription(d.description);
						if (d && d.donationUrl) setDonationUrl(d.donationUrl);
						if (d && typeof d.ai === "boolean") setAi(d.ai);
						setFiles((d?.files || []).map((f) => ({ ...f, isNew: true }) as EditorFile));
					}
				})
				.catch(() => {})
				.finally(() => setLoaded(true));
			return;
		}
		api<SubmissionDetail>(`/api/v1/auth/submissions/${id}`, { token: userToken() })
			.then(async (d) => {
				setSubId(d.id);
				setPackID(d.pack_id);
				setName(d.name);
				setAuthor(d.author);
				setDescription(d.description);
				setDonationUrl(d.donation_url);
				setAi(d.ai);
				setSubmissionStatus(d.status);
				setLogs(d.logs || []);
				const seen = new Set<string>();
				const base: EditorFile[] = [];
				for (const f of [...(d.files || [])].sort((a, b) => (a.created_at > b.created_at ? -1 : 1))) {
					const key = `${f.kind}:${f.system_id}`;
					if (seen.has(key)) continue;
					seen.add(key);
					base.push({
						fileName: f.file_name,
						kind: f.kind,
						systemId: f.system_id,
						size: f.size,
						mimeType: f.mime_type,
						objectKey: f.object_key,
						createdAt: f.created_at,
						reason: f.reason,
						registered: true,
						isNew: false,
					});
				}
				const overlay = await loadPackDraft(`pack-${d.id}`).catch(() => null);
				if (overlay) {
					if (overlay.name) setName(overlay.name);
					if (overlay.author) setAuthor(overlay.author);
					if (overlay.description) setDescription(overlay.description);
					if (overlay.donationUrl) setDonationUrl(overlay.donationUrl);
					if (typeof overlay.ai === "boolean") setAi(overlay.ai);
					for (const of of overlay.files || []) {
						if (!of.blob) continue;
						const idx = base.findIndex((f) => f.kind === of.kind && f.systemId === of.systemId);
						const entry: EditorFile = { ...of, isNew: true };
						if (idx >= 0) base[idx] = entry;
						else base.push(entry);
					}
				}
				setFiles(base);
				setLoaded(true);
			})
			.catch((e: Error) => {
				setStatus({ text: e.message, tone: "error" });
				setLoaded(true);
			});
	}, [id]);

	// Persist the draft (metadata + image blobs) automatically, debounced. Only
	// while the pack is a create/rejected-editable state (never once submitted).
	useEffect(() => {
		if (!editable) return;
		const t = setTimeout(() => {
			savePackDraft({ createdAt: Date.now(), name, author, description, donationUrl, ai, files }, draftKey).catch(() => {});
		}, 500);
		return () => clearTimeout(t);
	}, [editable, draftKey, name, author, description, donationUrl, ai, files]);

	async function addFile(file: File, systemId: string) {
		const ext = (file.name.split(".").pop() || "").toLowerCase();
		if (!["webp", "gif", "png", "jpg", "jpeg"].includes(ext)) {
			setStatus({ text: t("submissions.editor.errOnlyImages"), tone: "error" });
			return;
		}

		// GIFs keep their animation, so they are uploaded as-is (not re-encoded)
		// and capped at 5 MB. Every other image is uploaded in its original
		// format: the backend normalizes it to WebP on approval.
		const isGif = ext === "gif";
		if (isGif && file.size > MAX_GIF_BYTES) {
			setStatus({ text: t("submissions.editor.errGifTooLarge", { mb: MAX_GIF_BYTES / 1024 / 1024 }), tone: "error" });
			return;
		}

		const out: File = file;
		const fileName = `${systemId}.${ext}`;
		const mimeType = file.type || "application/octet-stream";
		const existing = files.find((f) => f.kind === "background" && f.systemId === systemId);
		if (existing) {
			// If the submission is still a draft, or the image being replaced is
			// still a local (un-uploaded) draft image, swap it directly without
			// asking for a replacement reason.
			const isDraftPack = !submissionStatus || submissionStatus === "created";
			if (isDraftPack || existing.isNew) {
				setFiles((prev) => [
					...prev.filter((f) => !(f.kind === "background" && f.systemId === systemId)),
					{ fileName, kind: "background", systemId, size: out.size, mimeType, blob: out, isNew: true },
				]);
				setStatus({ text: t("submissions.editor.updatedDraft", { name: fileName }), tone: "info" });
				return;
			}
			setReplaceDraft({ out, systemId });
			setReplaceReason("");
			return;
		}
		setFiles((prev) => [
			...prev.filter((f) => !(f.kind === "background" && f.systemId === systemId)),
			{ fileName, kind: "background", systemId, size: out.size, mimeType, blob: out, isNew: true },
		]);
		setStatus({ text: t("submissions.editor.addedDraft", { name: fileName }), tone: "info" });
	}

	// A staged server object must be removed server-side so it does not linger
	// on the submission; a local-only image is dropped from the draft.
	async function removeFile(file: EditorFile) {
		if (subId && file.objectKey) {
			try {
				await api(`/api/v1/submissions/${subId}/files?object_key=${encodeURIComponent(file.objectKey)}`, {
					method: "DELETE",
					token: userToken(),
				});
			} catch (e) {
				setStatus({ text: t("submissions.editor.removeFailed", { message: (e as Error).message }), tone: "error" });
				return;
			}
		}
		setFiles((prev) => prev.filter((f) => !(f.kind === file.kind && f.systemId === file.systemId)));
		setStatus({ text: t("submissions.editor.fileRemoved"), tone: "success" });
	}

	function confirmReplace() {
		if (!replaceDraft) return;
		const { out, systemId } = replaceDraft;
		const ext = (out.name.split(".").pop() || "").toLowerCase();
		const fileName = `${systemId}.${ext}`;
		const mimeType = out.type || "application/octet-stream";
		setFiles((prev) => [
			...prev.filter((f) => !(f.kind === "background" && f.systemId === systemId)),
			{ fileName, kind: "background", systemId, size: out.size, mimeType, reason: replaceReason.trim() || undefined, blob: out, isNew: true },
		]);
		setReplaceDraft(null);
		setReplaceReason("");
		setStatus({ text: t("submissions.editor.replacedDraft", { name: fileName }), tone: "info" });
	}

	async function uploadFileToTemp(f: EditorFile) {
		const resp = await api<{ upload_url: string; object_key: string }>("/api/v1/submissions/upload-url", {
			method: "POST",
			token: userToken(),
			body: { name, kind: f.kind, file_name: f.fileName, system_id: f.systemId, mime_type: f.mimeType, size: f.size },
		});
		await uploadWithProgress(resp.upload_url, f.blob!, f.mimeType, (p) =>
			setProgress({ active: true, label: t("submissions.editor.uploadingFile", { name: f.fileName }), percent: Math.round(p * 100) }),
		);
		return { kind: f.kind, system_id: f.systemId, object_key: resp.object_key, file_name: f.fileName, mime_type: f.mimeType, size: f.size, reason: f.reason };
	}

	function markUploaded(uploaded: { file_name: string; system_id: string; object_key: string }[], final: boolean) {
		setFiles((prev) =>
			prev.map((f) => {
				const u = uploaded.find((x) => x.file_name === f.fileName && x.system_id === f.systemId);
				return u ? { ...f, objectKey: u.object_key, registered: true, isNew: final ? false : f.isNew } : f;
			}),
		);
	}

	async function save() {
		if (!name.trim() || !author.trim()) {
			setStatus({ text: t("submissions.editor.required"), tone: "error" });
			return;
		}
		if (!subId) {
			setStatus({ text: t("submissions.editor.savedLocal"), tone: "success" });
			return;
		}
		setSubmitting(true);
		setStatus({ text: t("submissions.editor.saving"), tone: "info" });
		try {
			await api(`/api/v1/submissions/${subId}`, {
				method: "PUT",
				token: userToken(),
				body: { name, author, description, donation_url: donationUrl, ai },
			});
			const toUpload = files.filter((f) => f.blob && !f.objectKey);
			if (toUpload.length > 0) {
				setProgress({ active: true, label: t("submissions.editor.uploadingChanges"), percent: null });
				const uploaded = [];
				for (const f of toUpload) uploaded.push(await uploadFileToTemp(f));
				await api(`/api/v1/submissions/${subId}/files`, { method: "POST", token: userToken(), body: { files: uploaded } });
				markUploaded(uploaded, false);
			}
			setProgress({ active: false, label: "", percent: null });
			setStatus({ text: t("submissions.editor.draftSaved"), tone: "success" });
		} catch (e) {
			setStatus({ text: t("submissions.editor.saveFailed", { message: (e as Error).message }), tone: "error" });
		} finally {
			setSubmitting(false);
		}
	}

	async function submitForReview() {
		if (!name.trim() || !author.trim()) {
			setStatus({ text: t("submissions.editor.required"), tone: "error" });
			return;
		}
		if (!isContribution && files.filter((f) => f.kind === "background").length === 0) {
			setStatus({ text: t("submissions.editor.needBackground"), tone: "error" });
			return;
		}
		setSubmitting(true);
		setConfirmSubmit(false);
		setProgress({ active: true, label: t("submissions.editor.preparing"), percent: null });
		try {
			const toUpload = files.filter((f) => f.blob && !f.objectKey);
			const uploaded = [];
			let i = 0;
			for (const f of toUpload) {
				i++;
				setProgress({ active: true, label: t("submissions.editor.uploadingProgress", { name: f.fileName, current: i, total: toUpload.length }), percent: 0 });
				uploaded.push(await uploadFileToTemp(f));
			}
			setProgress({ active: false, label: "", percent: null });

			let sub: Submission;
			if (subId) {
				if (uploaded.length > 0) {
					await api(`/api/v1/submissions/${subId}/files`, { method: "POST", token: userToken(), body: { files: uploaded } });
					markUploaded(uploaded, true);
				}
				await api(`/api/v1/submissions/${subId}`, {
					method: "PUT",
					token: userToken(),
					body: { name, author, description, donation_url: donationUrl, ai },
				});
				sub = await api<Submission>(`/api/v1/submissions/${subId}/submit`, { method: "POST", token: userToken() });
				setSubId(sub.id);
				try { await clearPackDraft(`pack-${sub.id}`); } catch {}
			} else {
				sub = await api<Submission>("/api/v1/submissions", {
					method: "POST",
					token: userToken(),
					body: {
						name,
						author,
						description,
						donation_url: donationUrl,
						ai,
						contribution: isContribution,
						pack_id: isContribution ? basePack?.folder : undefined,
						files: uploaded.map((u) => ({ kind: u.kind, system_id: u.system_id, object_key: u.object_key, file_name: u.file_name, mime_type: u.mime_type, size: u.size, reason: u.reason })),
					},
				});
				setSubId(sub.id);
				if (uploaded.length > 0) markUploaded(uploaded, true);
				try { await clearPackDraft(draftKey); } catch {}
				try { await clearPackDraft(`pack-${sub.id}`); } catch {}
			}
			setSubmissionStatus(sub.status as SubmissionStatus);
			setStatus({ text: subId ? t("submissions.editor.submittedAgain") : t("submissions.editor.submitted"), tone: "success" });
		} catch (e) {
			setStatus({ text: t("submissions.editor.submitFailed", { message: (e as Error).message }), tone: "error" });
		} finally {
			setSubmitting(false);
		}
	}

	async function doTrash() {
		setConfirmTrash(false);
		setSubmitting(true);
		setStatus({ text: t("submissions.editor.removing"), tone: "info" });
		try {
			if (subId) {
				await api(`/api/v1/submissions/${subId}/trash`, { method: "POST", token: userToken() });
				try { await clearPackDraft(`pack-${subId}`); } catch {}
			} else {
				await clearPackDraft("current");
				navigate("/app/submissions");
			}
			setStatus({ text: t("submissions.editor.removed"), tone: "success" });
			setTimeout(() => navigate("/app/submissions"), 600);
		} catch (e) {
			setStatus({ text: t("submissions.editor.trashFailed", { message: (e as Error).message }), tone: "error" });
		} finally {
			setSubmitting(false);
		}
	}

	const canTrash = !subId || (submissionStatus !== null && submissionStatus !== "pending" && submissionStatus !== "approved" && submissionStatus !== "trashed");

	async function adminDeleteConfirmed() {
		if (!subId) return;
		setConfirmAdminDelete(false);
		setAdminDeleteBusy(true);
		setStatus({ text: t("submissions.editor.deletingPermanent"), tone: "info" });
		try {
			await api(`/api/v1/admin/submissions/${subId}`, { method: "DELETE", token: userToken() });
			setStatus({ text: t("submissions.editor.deleted"), tone: "success" });
			setTimeout(() => navigate("/app/submissions"), 600);
		} catch (e) {
			setStatus({ text: t("submissions.editor.deleteFailed", { message: (e as Error).message }), tone: "error" });
		} finally {
			setAdminDeleteBusy(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div>
					<Link to={isContribution ? "/app/sap" : "/app/submissions"} className="link text-sm inline-flex items-center gap-1">
						<ChevronLeft className="w-4 h-4" />
						{t("submissions.editor.back")}
					</Link>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2">
						{isContribution
							? t("submissions.editor.titleContribute", { pack: name || "…" })
							: subId && submissionStatus && !editable
							? t("submissions.editor.titleView")
							: subId && submissionStatus
							? t("submissions.editor.titleEdit")
							: t("submissions.editor.titleNew")}
					</h1>
					{submissionStatus ? (
						<p className="text-sm text-[var(--color-base-content)]/60 mt-1 flex items-center gap-2">
							{t("submissions.editor.statusLabel")} <span className={`badge ${STATUS_BADGE[submissionStatus] || "badge-info"} !px-2`}>{t("status." + submissionStatus)}</span>
						</p>
					) : null}
				</div>
			</div>

			{editable || canTrash || isAdmin() ? (
				<div className="flex flex-wrap items-center justify-end gap-2">
					{editable ? (
						<>
							<button className="btn btn-outline" type="button" disabled={submitting} onClick={save}>
								{t("submissions.editor.saveDraft")}
							</button>
							<button className="btn btn-primary" type="button" disabled={submitting} onClick={() => setConfirmSubmit(true)}>
								{submitting ? t("submissions.editor.working") : t("submissions.editor.submitForReview")}
							</button>
						</>
					) : null}
				{canTrash ? (
					<button className="btn btn-danger" type="button" disabled={submitting} onClick={() => setConfirmTrash(true)}>
						<Trash2 className="w-4 h-4" />
						{subId ? t("submissions.editor.moveToTrash") : t("submissions.editor.discardDraft")}
					</button>
				) : null}
				{isAdmin() && subId ? (
					<button className="btn btn-outline btn-error" type="button" disabled={adminDeleteBusy} onClick={() => setConfirmAdminDelete(true)}>
						<Trash2 className="w-4 h-4" />
						{t("common.delete")}
					</button>
				) : null}
				</div>
			) : null}

			{status && status.tone !== "error" ? (
				<div className={`card p-4 text-sm flex items-center gap-2`}>
					<span className={`${statusColor(status.tone)} font-semibold`}>{status.text}</span>
				</div>
			) : null}

			{editable ? null : (
				<div className="card p-4 text-sm flex items-center gap-2 text-[var(--color-info)]">
					{t("submissions.editor.readOnly", { status: t("status." + submissionStatus).toLowerCase() })}
				</div>
			)}

			{submissionStatus === "rejected" ? (() => {
				const r = (logs || []).filter((l) => l.action === "rejected").slice().reverse()[0];
				return (
					<div className="card p-4 text-sm border-l-4 border-[var(--color-error)] space-y-1">
						<p className="font-semibold text-[var(--color-error)]">{t("submissions.editor.rejectedTitle")}</p>
						{r?.detail ? <p className="text-[var(--color-base-content)]/70">{r.detail}</p> : <p className="text-[var(--color-base-content)]/60">{t("submissions.editor.noReason")}</p>}
						<p className="text-[var(--color-base-content)]/50 text-xs">{t("submissions.editor.rejectedHint")}</p>
					</div>
				);
			})() : null}

			{submissionStatus === "approved" ? (
				<div className="card p-4 text-sm border-l-4 border-[var(--color-success)] space-y-2">
					<p className="font-semibold text-[var(--color-success)]">{t("status.approved")}</p>
					<p className="text-[var(--color-base-content)]/60 text-xs">{t("submissions.editor.publishedBody")}</p>
					{packID ? (
						<Link to={`/app/sap/${packID}/contribute`} className="btn btn-primary btn-sm w-fit">
							{t("submissions.improveThisPack")}
						</Link>
					) : null}
				</div>
			) : null}

			{!loaded ? (
				<p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("submissions.editor.loading")}</p>
			) : (
				<>
					<section className="card p-6 md:p-8 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="label-text" htmlFor="pack-name">{t("submissions.form.nameLabel")}</label>
							<input id="pack-name" className={`input ${subId || isContribution ? "opacity-60 cursor-not-allowed" : ""}`} placeholder={t("submissions.form.namePlaceholder")} title={subId || isContribution ? t("submissions.form.nameFixedTitle") : ""} value={name} onChange={(e) => setName(e.target.value)} disabled={!!subId || isContribution} />
						</div>
						<div>
							<label className="label-text" htmlFor="pack-author">{t("common.author")}</label>
							<input id="pack-author" className={`input ${!editable || isContribution ? "opacity-60 cursor-not-allowed" : ""}`} placeholder={t("submissions.form.authorPlaceholder")} value={author} onChange={(e) => setAuthor(e.target.value)} disabled={!editable || isContribution} />
						</div>
						<div className="md:col-span-2">
							<label className="label-text" htmlFor="pack-description">{t("common.description")}</label>
							<textarea
								id="pack-description"
								className={`input !h-auto min-h-[5rem] py-2.5 ${!editable ? "opacity-60 cursor-not-allowed" : ""}`}
								placeholder={t("submissions.form.descriptionPlaceholder")}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								disabled={!editable}
							/>
						</div>
						<div>
							<label className="label-text" htmlFor="pack-donation">{t("submissions.form.donationLabel")}</label>
							<input id="pack-donation" className={`input ${!editable || isContribution ? "opacity-60 cursor-not-allowed" : ""}`} placeholder="https://ko-fi.com/you" value={donationUrl} onChange={(e) => setDonationUrl(e.target.value)} disabled={!editable || isContribution} />
						</div>
						<div className="md:col-span-2">
							<div className={`rounded-lg border border-[var(--color-base-300)] p-4 space-y-2 ${!editable || isContribution ? "opacity-60 cursor-not-allowed" : ""}`}>
								<label className="flex items-center gap-2 text-sm font-semibold cursor-pointer select-none">
									<input type="checkbox" className="checkbox checkbox-primary" checked={ai} onChange={(e) => setAi(e.target.checked)} disabled={!editable || isContribution} />
									<span>{t("submissions.form.aiLabel")}</span>
								</label>
								<p className="text-xs text-[var(--color-base-content)]/60 leading-relaxed">
									{t("submissions.form.aiNote1a")} <strong>{t("submissions.form.aiNote1b")}</strong>{t("submissions.form.aiNote1c")}
								</p>
								<p className="text-xs text-[var(--color-base-content)]/60 leading-relaxed">
									{t("submissions.form.aiNote2a")}{" "}
									<strong className="text-[var(--color-error)]">{t("submissions.form.aiNote2b")}</strong>{t("submissions.form.aiNote2c")}
								</p>
							</div>
						</div>
					</div>

					<div className="divider" />

					<div>
						<h2 className="font-semibold mb-1">{t("submissions.backgrounds.title")}</h2>
						<p className="text-sm text-[var(--color-base-content)]/60 mb-4">
							{t("submissions.backgrounds.hint")}
						</p>

						<input
							ref={addFileInputRef}
							type="file"
							accept=".webp,.gif,.png,.jpg,.jpeg"
							className="hidden"
							disabled={!editable}
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) addFile(file, addToSystemRef.current);
								e.target.value = "";
							}}
						/>

						{systemsLoading ? (
							<p className="text-sm text-[var(--color-base-content)]/50">{t("submissions.backgrounds.loadingSystems")}</p>
						) : systemsError ? (
							<div className="flex items-center gap-2 text-sm text-error">
								{t("submissions.backgrounds.loadFailed")}
								<button type="button" className="btn btn-ghost btn-xs !p-1" onClick={() => reloadSystems()}>
									{t("common.retry")}
								</button>
							</div>
						) : systems.length === 0 ? (
							<p className="text-sm text-[var(--color-base-content)]/50">{t("submissions.backgrounds.none")}</p>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
								{systems.map((s) => {
									const file = files.find((f) => f.kind === "background" && f.systemId === s.id);
									// Only files that belong to this draft can be removed:
									// a local blob or a staged (review/rejected) upload. The
									// pack's already-published images are shown for reference.
									const removable = Boolean(file && (file.blob || isStagedObjectKey(file.objectKey)));
									return (
										<div key={s.id} className="relative card card-border hover:card-hover p-2.5">
											<button
												type="button"
												disabled={!editable}
												onClick={() => {
													addToSystemRef.current = s.id;
													addFileInputRef.current?.click();
												}}
												className="w-full flex flex-col items-center gap-1.5 text-center disabled:opacity-50"
											>
												{file ? (
													<FileThumb blob={file.blob} src={file.objectKey ? cdnUrl(file.objectKey) + (file.createdAt ? `?v=${encodeURIComponent(file.createdAt)}` : "") : ""} />
												) : (
													<div className="w-full aspect-square rounded-lg bg-[var(--color-base-300)] flex items-center justify-center text-xl font-bold text-[var(--color-base-content)]/25">
														{(s.short_name || s.name).slice(0, 2).toUpperCase()}
													</div>
												)}
												<span className="font-medium text-xs line-clamp-2">{s.name}</span>
												<span className="text-[0.65rem] text-[var(--color-base-content)]/50 font-mono">{s.id}</span>
												{file ? (
													<>
														{file.isNew ? (
															<span className="badge badge-info badge-xs">{t("status.created")}</span>
														) : (
															<span className="badge badge-success badge-xs">{t("submissions.backgrounds.badgeUploaded")}</span>
														)}
														<span className="text-[0.65rem] text-[var(--color-base-content)]/50 font-mono">{(file.size / 1024).toFixed(0)} KB</span>
													</>
												) : (
													<span className="badge badge-ghost badge-xs">{t("common.add")}</span>
												)}
											</button>
											{editable && removable && file ? (
												<button
													type="button"
													onClick={() => removeFile(file)}
													className="btn btn-xs btn-circle btn-error absolute top-1 right-1"
													aria-label={t("common.delete")}
													title={t("common.delete")}
												>
													<X className="w-3 h-3" />
												</button>
											) : null}
										</div>
									);
								})}
							</div>
						)}

						{progress.active ? (
							<div className="card p-4 space-y-2 mt-4">
								<p className="text-sm font-medium text-[var(--color-base-content)]/80">{progress.label}</p>
								<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-base-300)]">
									{progress.percent === null ? (
										<div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--color-primary)] animate-progress-slide" />
									) : (
										<div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200" style={{ width: `${progress.percent}%` }} />
									)}
								</div>
							</div>
						) : null}
					</div>
				</section>

				{logs.length > 0 ? (
					<section className="card p-6">
						<h2 className="font-semibold mb-3">{t("submissions.history.title")}</h2>
						<div className="space-y-3 max-h-72 overflow-y-auto pr-2 -mr-2">
							{logs
								.slice()
								.reverse()
								.map((l, i) => (
									<div key={l.id} className="relative pl-6">
										<span className={`absolute left-0 top-1.5 size-2.5 rounded-full ${i === 0 ? "bg-[var(--color-primary)]" : "bg-[var(--color-base-300)]"}`} />
										<p className="text-xs font-semibold text-[var(--color-base-content)]/70">{t("log." + l.action, { defaultValue: l.action })}</p>
										{l.user_name ? <p className="text-xs text-[var(--color-base-content)]/60">{t("submissions.by")} <UserLink>{l.user_name}</UserLink></p> : null}
										{l.detail ? <p className="text-sm text-[var(--color-base-content)]/70 mt-0.5">{l.detail}</p> : null}
										<p className="text-[11px] text-[var(--color-base-content)]/40 mt-0.5">{formatDate(l.created_at)}</p>
									</div>
								))}
						</div>
					</section>
				) : null}
				</>
			)}

			{status && status.tone === "error" ? (
				<div
					className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
					onClick={(e) => e.target === e.currentTarget && setStatus(null)}
				>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-error)]/15 shrink-0">
								<AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("submissions.error.title")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">{status.text}</p>
							</div>
						</div>
						<div className="flex justify-end">
							<button className="btn btn-primary" type="button" onClick={() => setStatus(null)}>
								{t("submissions.editor.ok")}
							</button>
						</div>
					</div>
				</div>
			) : null}

			{replaceDraft ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setReplaceDraft(null)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-warning)]/15 shrink-0">
								<AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("submissions.replace.title")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">
									{t("submissions.replace.body")}
								</p>
							</div>
						</div>
						<div>
							<label className="label-text" htmlFor="replace-reason">{t("submissions.replace.reasonLabel")}</label>
							<textarea id="replace-reason" className="input !h-auto min-h-[5rem] py-2.5 w-full" placeholder={t("submissions.replace.reasonPlaceholder")} value={replaceReason} onChange={(e) => setReplaceReason(e.target.value)} />
						</div>
						<div className="flex justify-end gap-2">
							<button className="btn btn-ghost" type="button" onClick={() => setReplaceDraft(null)}>{t("common.cancel")}</button>
							<button className="btn btn-warning" type="button" disabled={!replaceReason.trim()} onClick={confirmReplace}>{t("submissions.replace.confirm")}</button>
						</div>
					</div>
				</div>
			) : null}

			{confirmSubmit ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setConfirmSubmit(false)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-warning)]/15 shrink-0">
								<AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("submissions.confirmSubmit.title")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">
									{t("submissions.confirmSubmit.body")}
								</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<button className="btn btn-ghost" type="button" onClick={() => setConfirmSubmit(false)}>{t("common.cancel")}</button>
							<button className="btn btn-primary" type="button" disabled={submitting} onClick={submitForReview}>{t("submissions.editor.submitForReview")}</button>
						</div>
					</div>
				</div>
			) : null}

			{submitting ? (
				<div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-center gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-primary)]/15 shrink-0">
								<Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("submissions.submitting.title")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 truncate">{progress.label || t("common.uploading")}</p>
							</div>
						</div>
						<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-base-300)]">
							{progress.percent === null ? (
								<div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--color-primary)] animate-progress-slide" />
							) : (
								<div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200" style={{ width: `${progress.percent}%` }} />
							)}
						</div>
						<p className="text-xs text-[var(--color-base-content)]/50 text-center">{progress.percent === null ? t("submissions.editor.working") : `${progress.percent}%`}</p>
					</div>
				</div>
			) : null}

			{confirmTrash ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setConfirmTrash(false)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-error)]/15 shrink-0">
								<Trash2 className="w-5 h-5 text-[var(--color-error)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("submissions.trash.title")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">
									{t("submissions.trash.body")}
								</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<button className="btn btn-ghost" type="button" onClick={() => setConfirmTrash(false)}>{t("common.cancel")}</button>
							<button className="btn btn-danger" type="button" disabled={submitting} onClick={doTrash}>{t("submissions.editor.moveToTrash")}</button>
						</div>
					</div>
				</div>
			) : null}

			{confirmAdminDelete ? (
				<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setConfirmAdminDelete(false)}>
					<div className="card w-full max-w-md p-6 space-y-4">
						<div className="flex items-start gap-3">
							<div className="grid size-9 place-items-center rounded-full bg-[var(--color-error)]/15 shrink-0">
								<Trash2 className="w-5 h-5 text-[var(--color-error)]" />
							</div>
							<div className="min-w-0">
								<h2 className="text-lg font-bold">{t("submissions.adminDelete.title")}</h2>
								<p className="text-sm text-[var(--color-base-content)]/70 mt-1">
									{t("submissions.adminDelete.body")}
								</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<button className="btn btn-ghost" type="button" onClick={() => setConfirmAdminDelete(false)}>{t("common.cancel")}</button>
							<button className="btn btn-danger" type="button" disabled={adminDeleteBusy} onClick={adminDeleteConfirmed}>{t("common.delete")}</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
