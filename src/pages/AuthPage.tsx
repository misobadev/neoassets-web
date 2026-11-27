import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthForm from "../components/AuthForm";
import { Isotype } from "../components/Brand";
import { useNoIndex, usePageMeta } from "../lib/seo";

// AuthPage renders the sign-in / register form inside the app shell. After a
// successful auth it returns the user to the page they were trying to reach
// (or the app home).
export default function AuthPage({ mode }: { mode: "login" | "register" }) {
	usePageMeta({ title: mode === "login" ? "Sign in - NeoAssets" : "Create account - NeoAssets" });
	useNoIndex();
	const navigate = useNavigate();
	const location = useLocation();
	const { t } = useTranslation();
	const state = location.state as { from?: string; notice?: string } | null;
	const from = state?.from || "/app/home";

	return (
		<div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<Isotype className="h-14 w-14 mx-auto mb-4" />
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">
						{mode === "register" ? t("auth.pageTitleRegister") : t("auth.pageTitleSignIn")}
					</h1>
					<p className="text-[var(--color-base-content)]/60 mt-1">{t("auth.pageSubtitle")}</p>
				</div>
				{state?.notice ? (
					<p role="status" className="text-sm font-semibold text-center text-[var(--color-success)] mb-4">
						{state.notice}
					</p>
				) : null}
				<div className="card card-tone p-6 md:p-8">
					{/* key forces a remount when navigating between /app/login and
					    /app/register, so the form opens on the route's mode. */}
					<AuthForm key={mode} initialMode={mode} onAuthed={() => navigate(from, { replace: true })} />
				</div>
			</div>
		</div>
	);
}
