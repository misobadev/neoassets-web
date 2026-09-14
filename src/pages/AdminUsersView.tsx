import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { fetchUsers, setUserRole, setDonorStatus, type User } from "../lib/api";
import Avatar from "../components/Avatar";

export default function AdminUsersView() {
	const { t } = useTranslation();
	const [users, setUsers] = useState<User[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<string | null>(null);

	function load() {
		fetchUsers()
			.then((list) => {
				setUsers(list);
				setError(null);
			})
			.catch((e: Error) => setError(e.message));
	}

	useEffect(() => {
		load();
	}, []);

	async function changeRole(u: User, role: string) {
		if (role === u.role) return;
		setBusy(u.id);
		try {
			await setUserRole(u.id, role);
			load();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(null);
		}
	}

	async function changeDonor(u: User, status: string) {
		if (status === u.donor_status) return;
		setBusy(u.id);
		try {
			await setDonorStatus(u.id, status);
			load();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(null);
		}
	}

	if (error && !users) return <p className="text-sm text-[var(--color-error)] text-center py-10">{error}</p>;
	if (!users) return <p className="text-sm text-[var(--color-base-content)]/50 text-center py-10">{t("admin.loadingUsers")}</p>;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Link to="/app/admin" className="btn btn-ghost !p-2" aria-label={t("common.back")}>
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("nav.users")}</h1>
					<p className="text-sm text-[var(--color-base-content)]/60">{t("admin.usersSubtitle")}</p>
				</div>
			</div>

			{error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}

			<section className="card p-6">
				<div className="grid grid-cols-1 gap-3">
					{users.map((u) => (
						<div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-base-300)]">
							<div className="flex items-center gap-3 min-w-0">
								<Avatar name={u.username} avatarKey={u.avatar_key} size={40} />
								<div className="min-w-0">
									<p className="font-medium truncate flex items-center gap-2">
										{u.username}
										{u.role === "admin" || u.role === "reviewer" ? <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" /> : null}
									</p>
									<p className="text-xs text-[var(--color-base-content)]/50 truncate">{u.email}</p>
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<select
									className="select select-sm w-40"
									value={u.donor_status}
									disabled={busy === u.id}
									onChange={(e) => changeDonor(u, e.target.value)}
									title={t("admin.donorLabel")}
								>
									{["none", "supporter", "monthly_supporter"].map((s) => (
										<option key={s} value={s}>{t("donor." + s, { defaultValue: s })}</option>
									))}
								</select>
								<select
									className="select select-sm w-32"
									value={u.role}
									disabled={busy === u.id || u.protected}
									onChange={(e) => changeRole(u, e.target.value)}
									title={u.protected ? t("admin.protectedAccount") : undefined}
								>
									{["user", "reviewer", "admin"].map((r) => (
										<option key={r} value={r}>{t("role." + r, { defaultValue: r })}</option>
									))}
								</select>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
