import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { HeartHandshake, KeyRound, Mail, Plus, ShieldCheck, Star, Trash2, User as UserIcon } from "lucide-react";
import CopyButton from "../components/CopyButton";
import DonorBadge from "../components/DonorBadge";
import { toSafeBackground } from "../lib/image";
import { uploadWithProgress } from "../lib/upload";
import {
	changePassword,
	cdnUrl,
	createAPIKey,
	deleteAPIKey,
	fetchAPIKeys,
	fetchMe,
	fetchRewards,
	presignAvatarUpload,
	removeAvatar,
	setAvatar,
	startDonorClaim,
	updateProfile,
	verifyDonorClaim,
	type Rewards,
	type User,
	type UserAPIKey,
	USER_NAME_KEY,
	USER_EMAIL_KEY,
} from "../lib/api";

// GIF avatars keep their animation and are capped at 5 MB; other images are
// centre-cropped to a 512x512 WebP.
const MAX_GIF_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 512;

function formatDate(value?: string | null, fallback?: string): string {
	if (!value) return fallback || "";
	return new Date(value).toLocaleString();
}

export default function ProfilePage() {
	const { t } = useTranslation();
	const [me, setMe] = useState<User | null>(null);
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [curPass, setCurPass] = useState("");
	const [newPass, setNewPass] = useState("");
	const [confirmPass, setConfirmPass] = useState("");
	const [profileMsg, setProfileMsg] = useState<{ text: string; tone: string } | null>(null);
	const [passMsg, setPassMsg] = useState<{ text: string; tone: string } | null>(null);
	const [busyProfile, setBusyProfile] = useState(false);
	const [busyPass, setBusyPass] = useState(false);
	const [rewards, setRewards] = useState<Rewards | null>(null);
	const [apiKeys, setApiKeys] = useState<UserAPIKey[]>([]);
	const [keyName, setKeyName] = useState("");
	const [keyMsg, setKeyMsg] = useState<string | null>(null);
	const [revealed, setRevealed] = useState<{ title: string; value: string } | null>(null);
	const [busyKey, setBusyKey] = useState(false);
	const [avatarBusy, setAvatarBusy] = useState(false);
	const [avatarMsg, setAvatarMsg] = useState<{ text: string; tone: string } | null>(null);
	const avatarInputRef = useRef<HTMLInputElement>(null);
	const [claimEmail, setClaimEmail] = useState("");
	const [claimCode, setClaimCode] = useState("");
	const [claimBusy, setClaimBusy] = useState(false);
	const [claimSent, setClaimSent] = useState(false);
	const [claimMsg, setClaimMsg] = useState<{ text: string; tone: string } | null>(null);

	async function sendClaimCode() {
		if (!claimEmail.trim()) return;
		setClaimBusy(true);
		setClaimMsg(null);
		try {
			await startDonorClaim(claimEmail.trim());
			setClaimSent(true);
			setClaimMsg({ text: t("donor.claimSent"), tone: "success" });
		} catch (e) {
			setClaimMsg({ text: (e as Error).message, tone: "error" });
		} finally {
			setClaimBusy(false);
		}
	}

	async function confirmClaim() {
		if (!claimCode.trim()) return;
		setClaimBusy(true);
		setClaimMsg(null);
		try {
			const res = await verifyDonorClaim(claimEmail.trim(), claimCode.trim());
			setClaimMsg({ text: t("donor.claimDone", { count: res.linked }), tone: "success" });
			setClaimSent(false);
			setClaimCode("");
			const r = await fetchRewards();
			setRewards(r);
		} catch (e) {
			setClaimMsg({ text: (e as Error).message, tone: "error" });
		} finally {
			setClaimBusy(false);
		}
	}

	async function onAvatarSelected(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const ext = (file.name.split(".").pop() || "").toLowerCase();
		if (!["webp", "gif", "png", "jpg", "jpeg"].includes(ext)) {
			setAvatarMsg({ text: t("profile.avatarInvalid"), tone: "error" });
			return;
		}
		const isGif = ext === "gif";
		if (isGif && file.size > MAX_GIF_BYTES) {
			setAvatarMsg({ text: t("profile.avatarGifTooLarge", { mb: MAX_GIF_BYTES / 1024 / 1024 }), tone: "error" });
			return;
		}
		setAvatarBusy(true);
		setAvatarMsg(null);
		try {
			const out = isGif ? file : await toSafeBackground(file, AVATAR_SIZE);
			const mime = isGif ? "image/gif" : "image/webp";
			const resp = await presignAvatarUpload(mime, out.size);
			await uploadWithProgress(resp.upload_url, out, mime, () => {});
			const updated = await setAvatar(resp.object_key);
			setMe(updated);
			setAvatarMsg({ text: t("profile.avatarUpdated"), tone: "success" });
		} catch (err) {
			setAvatarMsg({ text: (err as Error).message, tone: "error" });
		} finally {
			setAvatarBusy(false);
		}
	}

	async function onAvatarRemove() {
		setAvatarBusy(true);
		setAvatarMsg(null);
		try {
			const updated = await removeAvatar();
			setMe(updated);
			setAvatarMsg({ text: t("profile.avatarRemoved"), tone: "success" });
		} catch (err) {
			setAvatarMsg({ text: (err as Error).message, tone: "error" });
		} finally {
			setAvatarBusy(false);
		}
	}

	function toneColor(tone: string) {
		return ({ info: "text-[var(--color-info)]", success: "text-[var(--color-success)]", error: "text-[var(--color-error)]" } as const)[
			tone as "info" | "success" | "error"
		] || "text-[var(--color-info)]";
	}

	useEffect(() => {
		fetchMe()
			.then((u) => {
				setMe(u);
				setUsername(u.username);
				setEmail(u.email);
			})
			.catch((e: Error) => setProfileMsg({ text: e.message, tone: "error" }));
		fetchRewards()
			.then(setRewards)
			.catch(() => {});
		void loadKeys();
	}, []);

	async function loadKeys() {
		try {
			setApiKeys(await fetchAPIKeys());
		} catch {
			/* ignore */
		}
	}

	async function createKey() {
		if (!keyName.trim()) return;
		setBusyKey(true);
		setKeyMsg(null);
		try {
			const key = await createAPIKey({ name: keyName.trim() });
			setKeyName("");
			setRevealed({ title: `${key.name} — ${t("apiKeys.key")}`, value: key.key });
			await loadKeys();
		} catch (e) {
			setKeyMsg((e as Error).message);
		} finally {
			setBusyKey(false);
		}
	}

	async function deleteKey(key: UserAPIKey) {
		if (!window.confirm(t("apiKeys.confirmDelete", { name: key.name }))) return;
		try {
			await deleteAPIKey(key.id);
			await loadKeys();
		} catch (e) {
			setKeyMsg((e as Error).message);
		}
	}

	async function saveProfile() {
		setBusyProfile(true);
		setProfileMsg(null);
		try {
			const u = await updateProfile({ username, email });
			setMe(u);
			if (u.username) localStorage.setItem(USER_NAME_KEY, u.username);
			if (u.email) localStorage.setItem(USER_EMAIL_KEY, u.email);
			setProfileMsg({ text: t("profile.updated"), tone: "success" });
		} catch (e) {
			setProfileMsg({ text: (e as Error).message, tone: "error" });
		} finally {
			setBusyProfile(false);
		}
	}

	async function savePassword() {
		setPassMsg(null);
		if (newPass !== confirmPass) {
			setPassMsg({ text: t("profile.passwordMismatch"), tone: "error" });
			return;
		}
		setBusyPass(true);
		try {
			await changePassword({ current_password: curPass, new_password: newPass });
			setCurPass("");
			setNewPass("");
			setConfirmPass("");
			setPassMsg({ text: t("profile.passwordUpdated"), tone: "success" });
		} catch (e) {
			setPassMsg({ text: (e as Error).message, tone: "error" });
		} finally {
			setBusyPass(false);
		}
	}

	if (!me) return <p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("profile.loading")}</p>;

	// Revoked keys are hidden.
	const activeKeys = apiKeys.filter((k) => !k.revoked_at);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("profile.title")}</h1>
				<p className="text-sm text-[var(--color-base-content)]/60">{t("profile.subtitle")}</p>
			</div>

			<section className="card p-6 space-y-4">
				<h2 className="font-semibold flex items-center gap-2"><UserIcon className="w-4 h-4" /> {t("nav.account")}</h2>
				<div className="flex items-center gap-4">
					<div className="size-24 rounded-xl overflow-hidden bg-[var(--color-primary)]/15 grid place-items-center shrink-0">
						{me.avatar_key ? (
							<img src={cdnUrl(me.avatar_key)} alt="" className="w-full h-full object-cover" />
						) : (
							<span className="text-4xl font-bold text-[var(--color-primary-soft)]">{(me.username || "?").slice(0, 1).toUpperCase()}</span>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-semibold truncate">{me.username}</p>
						<p className="text-xs text-[var(--color-base-content)]/50 truncate">{me.email}</p>
						<div className="flex items-center gap-2 mt-1.5">
							<button type="button" className="btn btn-outline btn-xs" onClick={() => avatarInputRef.current?.click()} disabled={avatarBusy}>
								{avatarBusy ? t("profile.avatarUploading") : t("profile.editAvatar")}
							</button>
							{me.avatar_key ? (
								<button type="button" className="btn btn-ghost btn-xs" onClick={onAvatarRemove} disabled={avatarBusy}>
									{t("profile.removeAvatar")}
								</button>
							) : null}
							<input ref={avatarInputRef} type="file" accept=".webp,.gif,.png,.jpg,.jpeg" className="hidden" onChange={onAvatarSelected} />
						</div>
					</div>
					<span className={`badge ${me.role === "admin" ? "badge-rose" : me.role === "reviewer" ? "badge-purple" : "badge-outline"} !px-2 ml-2`}>
						<ShieldCheck className="w-3.5 h-3.5 mr-1" />
						{t("role." + me.role, { defaultValue: me.role })}
					</span>
				</div>
				{avatarMsg ? <p className={`text-sm font-semibold ${toneColor(avatarMsg.tone)}`}>{avatarMsg.text}</p> : null}

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="label-text">{t("auth.username")}</label>
						<input className="input w-full" value={username} onChange={(e) => setUsername(e.target.value)} />
					</div>
					<div>
						<label className="label-text">{t("auth.email")}</label>
						<input className="input w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
					</div>
				</div>
				{profileMsg ? <p className={`text-sm font-semibold ${toneColor(profileMsg.tone)}`}>{profileMsg.text}</p> : null}
				<div className="flex justify-end">
					<button className="btn btn-primary" onClick={saveProfile} disabled={busyProfile}>{busyProfile ? t("common.saving") : t("common.saveChanges")}</button>
				</div>
			</section>

			<section className="card p-6 space-y-4">
				<h2 className="font-semibold flex items-center gap-2"><Star className="w-4 h-4" /> {t("profile.rewards")}</h2>
				{rewards ? (
					<>
						<div className="flex items-center justify-between gap-4 flex-wrap">
							<div className="flex items-center gap-3">
								<div className="rounded-xl bg-[var(--color-primary)]/15 px-3 py-2 text-center">
									<p className="text-[10px] uppercase tracking-wide text-[var(--color-base-content)]/50">{t("profile.level")}</p>
									<p className="text-2xl font-bold text-[var(--color-primary-soft)]">{rewards.level}</p>
								</div>
								<div>
									<p className="font-semibold flex items-center gap-2">
										{t("guide.ranks." + rewards.rank, { defaultValue: rewards.rank })}
										<DonorBadge status={rewards.donor_status} />
									</p>
									<p className="text-xs text-[var(--color-base-content)]/50">{rewards.xp.toLocaleString()} {t("common.xp")}</p>
								</div>
							</div>
							<div className="flex items-center gap-4 text-center">
								<div>
									<p className="text-2xl font-bold">{rewards.threads}</p>
									<p className="text-[11px] text-[var(--color-base-content)]/50">{t("common.threads")}</p>
								</div>
								<div>
									<p className="text-2xl font-bold">{rewards.daily_games.toLocaleString()}</p>
									<p className="text-[11px] text-[var(--color-base-content)]/50">{t("profile.gamesPerDay")}</p>
								</div>
							</div>
						</div>
						{rewards.next_level_xp > 0 ? (
							<div className="space-y-1">
								<div className="flex items-center justify-between text-[11px] text-[var(--color-base-content)]/50">
									<span>{t("profile.progressToLevel", { level: rewards.level + 1 })}</span>
									<span>{rewards.xp.toLocaleString()} / {rewards.next_level_xp.toLocaleString()} {t("common.xp")}</span>
								</div>
								<div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-base-300)]">
									<div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-300" style={{ width: `${rewards.progress_pct}%` }} />
								</div>
							</div>
						) : (
							<p className="text-xs font-semibold text-[var(--color-success)]">{t("profile.maxLevel")}</p>
						)}
						<p className="text-xs text-[var(--color-base-content)]/50">{t("profile.earnXP")}</p>
						{rewards.donor_bonus_threads > 0 ? (
							<p className="text-xs text-[var(--color-base-content)]/50">{t("profile.donorBoost", { threads: rewards.donor_bonus_threads, xp: rewards.xp_bonus_pct })}</p>
						) : null}
					</>
				) : <p className="text-sm text-[var(--color-base-content)]/50">{t("profile.loadingRewards")}</p>}
			</section>

			<section className="card p-6 space-y-4">
				<h2 className="font-semibold flex items-center gap-2"><HeartHandshake className="w-4 h-4" /> {t("donor.claimTitle")}</h2>
				<p className="text-xs text-[var(--color-base-content)]/60">{t("donor.claimSubtitle")}</p>
				<div className="flex flex-wrap gap-2">
					<input className="input input-bordered" type="email" placeholder={t("donor.claimEmailPlaceholder")} value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} disabled={claimBusy} />
					<button className="btn btn-primary btn-sm" onClick={sendClaimCode} disabled={claimBusy || !claimEmail.trim()}>{t("donor.claimSend")}</button>
				</div>
				{claimSent ? (
					<div className="flex flex-wrap gap-2">
						<input className="input input-bordered" inputMode="numeric" maxLength={6} placeholder={t("donor.claimCodePlaceholder")} value={claimCode} onChange={(e) => setClaimCode(e.target.value)} disabled={claimBusy} />
						<button className="btn btn-primary btn-sm" onClick={confirmClaim} disabled={claimBusy || !claimCode.trim()}>{t("donor.claimConfirm")}</button>
					</div>
				) : null}
				{claimMsg ? <p className={`text-sm font-semibold ${claimMsg.tone === "error" ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`}>{claimMsg.text}</p> : null}
			</section>

			<section className="card p-6 space-y-4">
				<h2 className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4" /> {t("apiKeys.title")}</h2>
				<p className="text-xs text-[var(--color-base-content)]/60">{t("apiKeys.subtitle")}</p>
				<div className="flex flex-wrap gap-2">
					<input className="input input-bordered" placeholder={t("apiKeys.name")} value={keyName} onChange={(e) => setKeyName(e.target.value)} />
					<button className="btn btn-primary btn-sm gap-1" onClick={createKey} disabled={busyKey || !keyName.trim()}>
						<Plus className="w-4 h-4" /> {t("apiKeys.create")}
					</button>
				</div>
				<p className="text-xs text-[var(--color-base-content)]/60">{t("apiKeys.hint")}</p>
				{keyMsg ? <p className="text-sm font-semibold text-[var(--color-error)]">{keyMsg}</p> : null}
				{activeKeys.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/60">{t("apiKeys.empty")}</p>
				) : (
					<ul className="divide-y divide-[var(--color-base-300)]">
						{activeKeys.map((key) => (
							<li key={key.id} className="py-3 flex flex-wrap items-center gap-3">
								<div className="min-w-0 flex-1">
									<p className="font-medium truncate">{key.name}</p>
									<p className="text-xs text-[var(--color-base-content)]/60">{key.prefix}...</p>
									<p className="text-xs text-[var(--color-base-content)]/50">
										{t("apiKeys.lastUsed")}: {formatDate(key.last_used_at, t("apiKeys.never"))}
									</p>
								</div>
								<button type="button" className="btn btn-ghost btn-sm gap-1 text-red-500" onClick={() => deleteKey(key)}>
									<Trash2 className="w-3.5 h-3.5" /> {t("apiKeys.delete")}
								</button>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="card p-6 space-y-4">
				<h2 className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> {t("profile.changePassword")}</h2>				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div>
						<label className="label-text">{t("profile.currentPassword")}</label>
						<input className="input w-full" type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} />
					</div>
					<div>
						<label className="label-text">{t("auth.newPassword")}</label>
						<input className="input w-full" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
					</div>
					<div>
						<label className="label-text">{t("profile.confirmNewPassword")}</label>
						<input className="input w-full" type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
					</div>
				</div>
				{passMsg ? <p className={`text-sm font-semibold ${toneColor(passMsg.tone)}`}>{passMsg.text}</p> : null}
				<div className="flex justify-end">
					<button className="btn btn-primary" onClick={savePassword} disabled={busyPass}>{busyPass ? t("common.updating") : t("profile.updatePassword")}</button>
				</div>
			</section>

			{revealed ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
					<div className="card w-full max-w-lg p-6 space-y-3">
						<p className="font-semibold">{revealed.title}</p>
						<p className="text-xs text-red-500">{t("apiKeys.shownOnce")}</p>
						<code className="block break-all rounded bg-[var(--color-base-200)] px-3 py-2 text-xs">{revealed.value}</code>
						<div className="flex items-center justify-end gap-2">
							<CopyButton value={revealed.value} />
							<button type="button" className="btn btn-primary btn-sm" onClick={() => setRevealed(null)}>
								{t("apiKeys.saved")}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
