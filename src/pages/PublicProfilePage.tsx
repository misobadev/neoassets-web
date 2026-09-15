import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Check, UserPlus } from "lucide-react";
import UserLink from "../components/UserLink";
import DonorBadge from "../components/DonorBadge";
import {
	cdnUrl,
	fetchPublicProfile,
	fetchMe,
	followUser,
	unfollowUser,
	fetchFollowers,
	fetchFollowing,
	fetchUserSubmissions,
	type PublicProfile,
	type UserSubmissionItem,
} from "../lib/api";
import { formatDate } from "../lib/format";

const STATUS_BADGE: Record<string, string> = {
	created: "badge-info",
	pending: "badge-warning",
	approved: "badge-success",
	rejected: "badge-error",
	trashed: "badge-ghost",
};

export default function PublicProfilePage() {
	const { t } = useTranslation();
	const { username } = useParams<{ username: string }>();
	const [profile, setProfile] = useState<PublicProfile | null>(null);
	const [followers, setFollowers] = useState<string[]>([]);
	const [following, setFollowing] = useState<string[]>([]);
	const [submissions, setSubmissions] = useState<UserSubmissionItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [myId, setMyId] = useState<string | null>(null);

	const self = profile ? profile.id === myId : false;

	useEffect(() => {
		fetchMe().then((u) => setMyId(u.id)).catch(() => {});
	}, []);

	useEffect(() => {
		if (!username) return;
		setError(null);
		fetchPublicProfile(username)
			.then((p) => {
				setProfile(p);
				return Promise.all([fetchFollowers(username), fetchFollowing(username), fetchUserSubmissions(username)]);
			})
			.then(([foll, folling, subs]) => {
				setFollowers(foll);
				setFollowing(folling);
				setSubmissions(subs);
			})
			.catch((e: Error) => setError(e.message));
	}, [username]);

	async function toggleFollow() {
		if (!profile) return;
		setBusy(true);
		try {
			if (profile.is_following) {
				await unfollowUser(profile.username);
				setProfile({ ...profile, is_following: false, followers: profile.followers - 1 });
			} else {
				await followUser(profile.username);
				setProfile({ ...profile, is_following: true, followers: profile.followers + 1 });
			}
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	if (error && !profile) return <p className="text-sm text-[var(--color-error)] text-center py-10">{error}</p>;
	if (!profile) return <p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("publicProfile.loading")}</p>;

	return (
		<div className="space-y-6">
			<section className="card p-6 space-y-4">
				<div className="flex items-center gap-4">
					<div className="size-24 rounded-xl overflow-hidden bg-[var(--color-primary)]/15 grid place-items-center text-4xl font-bold text-[var(--color-primary-soft)] shrink-0">
						{profile.avatar_key ? (
							<img src={cdnUrl(profile.avatar_key)} alt="" className="w-full h-full object-cover" />
						) : (
							(profile.username || "?").slice(0, 1).toUpperCase()
						)}
					</div>
					<div className="min-w-0 flex-1">
						<h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{profile.username}</h1>
						<p className="text-sm text-[var(--color-base-content)]/60 flex items-center gap-2 flex-wrap">
							<span className={`badge ${profile.role === "admin" ? "badge-rose" : profile.role === "reviewer" ? "badge-purple" : "badge-outline"} !px-2`}>{t("role." + profile.role, { defaultValue: profile.role })}</span>
							<DonorBadge status={profile.donor_status} />
							<span>{t("publicProfile.joined", { date: formatDate(profile.created_at) })}</span>
						</p>
					</div>
					{!self ? (
						<button className={`btn ${profile.is_following ? "btn-outline" : "btn-primary"} shrink-0`} onClick={toggleFollow} disabled={busy}>
							{profile.is_following ? <><Check className="w-4 h-4" /> {t("publicProfile.following")}</> : <><UserPlus className="w-4 h-4" /> {t("publicProfile.follow")}</>}
						</button>
					) : null}
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<Stat n={t("guide.ranks." + profile.rank, { defaultValue: profile.rank })} label={t("publicProfile.rank")} />
					<Stat n={profile.level} label={t("profile.level")} />
					<Stat n={`${profile.xp.toLocaleString()}`} label={t("common.xp")} />
					<Stat n={profile.threads} label={t("common.threads")} />
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<Stat n={profile.approved} label={t("publicProfile.approved")} />
					<Stat n={profile.submitted} label={t("publicProfile.contributions")} />
					<Stat n={profile.followers} label={t("publicProfile.followers")} />
					<Stat n={profile.following} label={t("publicProfile.following")} />
				</div>
			</section>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<UserList title={t("publicProfile.followers")} usernames={followers} />
				<UserList title={t("publicProfile.following")} usernames={following} />
			</div>

			<section className="card p-5 space-y-2">
				<h2 className="font-semibold text-sm">{t("publicProfile.recentSubmissions")}</h2>
				{submissions.length === 0 ? (
					<p className="text-sm text-[var(--color-base-content)]/50">{t("publicProfile.noSubmissions")}</p>
				) : (
					<ul className="space-y-2">
						{submissions.map((s) => (
							<li key={`${s.kind}-${s.id}`}>
								<Link to={s.kind === "sap" ? `/app/submissions/${s.id}` : s.game_id && s.system_id ? `/app/metadata/${s.system_id}/game/${s.game_id}` : "/app/metadata"}>
									<div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-base-300)] px-3 py-2 hover:bg-base-300">
										<div className="min-w-0">
											<p className="font-medium text-sm truncate">{s.title || (s.kind === "sap" ? t("publicProfile.untitledPack") : t("publicProfile.untitled"))}</p>
											<p className="text-[11px] text-[var(--color-base-content)]/50">{s.kind === "sap" ? t("nav.systemArtPack") : t("publicProfile.metadata")} · {formatDate(s.created_at)}</p>
										</div>
										<span className={`badge ${STATUS_BADGE[s.status] || "badge-info"} !px-2 shrink-0`}>{t("status." + s.status, { defaultValue: s.status })}</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function Stat({ n, label }: { n: number | string; label: string }) {
	return (
		<div className="rounded-lg border border-[var(--color-base-300)] p-3 text-center">
			<p className="text-2xl font-bold">{n}</p>
			<p className="text-[11px] text-[var(--color-base-content)]/50">{label}</p>
		</div>
	);
}

function UserList({ title, usernames }: { title: string; usernames: string[] }) {
	const { t } = useTranslation();
	return (
		<section className="card p-5 space-y-2">
			<h2 className="font-semibold text-sm">{title}</h2>
			{usernames.length === 0 ? (
				<p className="text-sm text-[var(--color-base-content)]/50">{t("publicProfile.noOneYet")}</p>
			) : (
				<ul className="space-y-1">
					{usernames.map((u) => (
						<li key={u}><UserLink>{u}</UserLink></li>
					))}
				</ul>
			)}
		</section>
	);
}
