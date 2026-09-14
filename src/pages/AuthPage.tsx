import { useLocation, useNavigate } from "react-router-dom";
import { Image } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthForm from "../components/AuthForm";

// AuthPage renders the sign-in / register form inside the app shell. After a
// successful auth it returns the user to the page they were trying to reach
// (or the app home).
export default function AuthPage({ mode }: { mode: "login" | "register" }) {
	const navigate = useNavigate();
	const location = useLocation();
	const { t } = useTranslation();
	const from = (location.state as { from?: string } | null)?.from || "/app/home";

	return (
		<div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<span className="pill inline-flex mx-auto mb-3">
						<Image className="w-3.5 h-3.5 text-[var(--color-primary)]" />
						NeoAssets
					</span>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">
						{mode === "register" ? t("auth.pageTitleRegister") : t("auth.pageTitleSignIn")}
					</h1>
					<p className="text-[var(--color-base-content)]/60 mt-1">
						{t("auth.pageSubtitle")}
					</p>
				</div>
				<div className="card p-6 md:p-8">
					<AuthForm initialMode={mode} onAuthed={() => navigate(from, { replace: true })} />
				</div>
			</div>
		</div>
	);
}