import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type AuthResult, USER_EMAIL_KEY, USER_TOKEN_KEY, ADMIN_EMAIL_KEY, ADMIN_TOKEN_KEY, USER_ROLE_KEY, USER_NAME_KEY, USER_ID_KEY } from "../lib/api";

type AuthMode = "login" | "register" | "forgot" | "reset";

export default function AuthForm({ onAuthed, initialMode = "login" }: { onAuthed?: () => void; initialMode?: AuthMode }) {
	const { t } = useTranslation();
	const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
	const [authMsg, setAuthMsg] = useState<{ text?: string; key?: string; tone: string } | null>(null);
	const [authEmail, setAuthEmail] = useState("");
	const [authPassword, setAuthPassword] = useState("");
	const [regUsername, setRegUsername] = useState("");
	const [regEmail, setRegEmail] = useState("");
	const [regPassword, setRegPassword] = useState("");
	const [forgotEmail, setForgotEmail] = useState("");
	const [resetPassword, setResetPassword] = useState("");
	const [resetToken, setResetToken] = useState<string | null>(null);

	async function doRegister() {
		setAuthMsg({ key: "auth.creatingAccount", tone: "info" });
		try {
			await api("/api/v1/register", {
				method: "POST",
				body: { username: regUsername, email: regEmail, password: regPassword },
			});
			setAuthMsg({ key: "auth.accountCreated", tone: "success" });
			setAuthMode("login");
		} catch (e) {
			setAuthMsg({ text: (e as Error).message, tone: "error" });
		}
	}

	async function doLogin() {
		setAuthMsg({ key: "auth.signingIn", tone: "info" });
		try {
			const data = await api<AuthResult>("/api/v1/login", {
				method: "POST",
				body: { email: authEmail, password: authPassword },
			});
			localStorage.setItem(USER_TOKEN_KEY, data.token);
			localStorage.setItem(USER_EMAIL_KEY, data.user.email);
			localStorage.setItem(USER_NAME_KEY, data.user.username || "");
			localStorage.setItem(USER_ID_KEY, data.user.id || "");
			localStorage.setItem(USER_ROLE_KEY, data.user.role || "user");
			if (data.is_admin && data.admin_token) {
				localStorage.setItem(ADMIN_TOKEN_KEY, data.admin_token);
				localStorage.setItem(ADMIN_EMAIL_KEY, data.user.email);
			}
			setAuthMsg(null);
			onAuthed?.();
		} catch (e) {
			setAuthMsg({ text: (e as Error).message, tone: "error" });
		}
	}

	async function doForgot() {
		setAuthMsg({ key: "auth.sendingReset", tone: "info" });
		try {
			await api("/api/v1/forgot-password", {
				method: "POST",
				body: { email: forgotEmail },
			});
			setAuthMsg({ key: "auth.resetSent", tone: "success" });
			setAuthMode("login");
		} catch (e) {
			setAuthMsg({ text: (e as Error).message, tone: "error" });
		}
	}

	async function doReset() {
		if (!resetToken) return;
		setAuthMsg({ key: "auth.settingPassword", tone: "info" });
		try {
			await api("/api/v1/reset-password", {
				method: "POST",
				body: { token: resetToken, new_password: resetPassword },
			});
			setAuthMsg({ key: "auth.passwordUpdated", tone: "success" });
			history.replaceState({}, "", location.pathname);
			setAuthMode("login");
		} catch (e) {
			setAuthMsg({ text: (e as Error).message, tone: "error" });
		}
	}

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const verify = params.get("verify");
		const reset = params.get("reset");
		if (verify) {
			setAuthMode("login");
			setAuthMsg({ key: "auth.verifyingEmail", tone: "info" });
			api("/api/v1/verify-email", { method: "POST", body: { token: verify } })
				.then(() => {
					setAuthMsg({ key: "auth.emailVerified", tone: "success" });
					history.replaceState({}, "", location.pathname);
				})
				.catch((e: Error) => setAuthMsg({ text: e.message, tone: "error" }));
		} else if (reset) {
			setResetToken(reset);
			setAuthMode("reset");
		}
	}, []);

	const toneColor = (tone: string) =>
		({ info: "text-[var(--color-info)]", success: "text-[var(--color-success)]", error: "text-[var(--color-error)]", warning: "text-[var(--color-warning)]" })[tone] || "text-[var(--color-info)]";

	return (
		<div className="max-w-md mx-auto w-full">
			<div className="flex items-center gap-2 justify-center mb-6">
				<button
					className={authMode === "login" ? "btn btn-primary" : "btn btn-ghost"}
					type="button"
					onClick={() => setAuthMode("login")}
				>
					{t("auth.signIn")}
				</button>
				<button
					className={authMode === "register" ? "btn btn-primary" : "btn btn-ghost"}
					type="button"
					onClick={() => setAuthMode("register")}
				>
					{t("auth.createAccount")}
				</button>
			</div>

			{authMode === "login" && (
				<div className="space-y-4">
					<div>
						<label className="label-text" htmlFor="auth-email">{t("auth.email")}</label>
						<input
							id="auth-email"
							className="input"
							type="email"
							placeholder={t("auth.emailPlaceholder")}
							value={authEmail}
							onChange={(e) => setAuthEmail(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && doLogin()}
						/>
					</div>
					<div>
						<label className="label-text" htmlFor="auth-password">{t("auth.password")}</label>
						<input
							id="auth-password"
							className="input"
							type="password"
							placeholder={t("auth.passwordPlaceholder")}
							value={authPassword}
							onChange={(e) => setAuthPassword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && doLogin()}
						/>
					</div>
					<button className="btn btn-primary w-full" type="button" onClick={doLogin}>
						{t("auth.signIn")}
					</button>
					<div className="text-center">
						<button className="link text-sm" type="button" onClick={() => setAuthMode("forgot")}>
							{t("auth.forgotPassword")}
						</button>
					</div>
				</div>
			)}

			{authMode === "register" && (
				<div className="space-y-4">
					<div>
						<label className="label-text" htmlFor="reg-username">{t("auth.username")}</label>
						<input
							id="reg-username"
							className="input"
							placeholder={t("auth.usernamePlaceholder")}
							value={regUsername}
							onChange={(e) => setRegUsername(e.target.value)}
						/>
					</div>
					<div>
						<label className="label-text" htmlFor="reg-email">{t("auth.email")}</label>
						<input
							id="reg-email"
							className="input"
							type="email"
							placeholder={t("auth.emailPlaceholder")}
							value={regEmail}
							onChange={(e) => setRegEmail(e.target.value)}
						/>
					</div>
					<div>
						<label className="label-text" htmlFor="reg-password">{t("auth.password")}</label>
						<input
							id="reg-password"
							className="input"
							type="password"
							placeholder={t("auth.passwordMinPlaceholder")}
							value={regPassword}
							onChange={(e) => setRegPassword(e.target.value)}
						/>
					</div>
					<button className="btn btn-primary w-full" type="button" onClick={doRegister}>
						{t("auth.createAccount")}
					</button>
					<p className="text-xs text-[var(--color-base-content)]/50 text-center">
						{t("auth.verificationNote")}
					</p>
				</div>
			)}

			{authMode === "forgot" && (
				<div className="space-y-4">
					<div>
						<label className="label-text" htmlFor="forgot-email">{t("auth.email")}</label>
						<input
							id="forgot-email"
							className="input"
							type="email"
							placeholder={t("auth.emailPlaceholder")}
							value={forgotEmail}
							onChange={(e) => setForgotEmail(e.target.value)}
						/>
					</div>
					<button className="btn btn-primary w-full" type="button" onClick={doForgot}>
						{t("auth.sendResetLink")}
					</button>
					<div className="text-center">
						<button className="link text-sm" type="button" onClick={() => setAuthMode("login")}>
							{t("auth.backToSignIn")}
						</button>
					</div>
				</div>
			)}

			{authMode === "reset" && (
				<div className="space-y-4">
					<div>
						<label className="label-text" htmlFor="reset-password">{t("auth.newPassword")}</label>
						<input
							id="reset-password"
							className="input"
							type="password"
							placeholder={t("auth.passwordMinPlaceholder")}
							value={resetPassword}
							onChange={(e) => setResetPassword(e.target.value)}
						/>
					</div>
					<button className="btn btn-primary w-full" type="button" onClick={doReset}>
						{t("auth.setNewPassword")}
					</button>
				</div>
			)}

			{authMsg ? (
				<div className={`card p-3 text-sm font-semibold ${toneColor(authMsg.tone)} mt-4`}>
					{authMsg.key ? t(authMsg.key) : authMsg.text}
				</div>
			) : null}
		</div>
	);
}