import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
	Bell,
	Gamepad2,
	HelpCircle,
	Home,
	KeyRound,
	LayoutDashboard,
	LayoutGrid,
	Loader2,
	ListChecks,
	LogIn,
	LogOut,
	Menu,
	X,
	Moon,
	Palette,
	Sun,
	Terminal,
	User,
	UserPlus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelect from "../components/LanguageSelect";
import { useReviews } from "../lib/reviews";
import { signOut, useRoleRefresh, useSession } from "../lib/session";
import { useIsMobile } from "../lib/useMediaQuery";

const THEME_KEY = "ns-theme";
const SIDEBAR_KEY = "ns-sidebar-collapsed";

function initialTheme(): "dark" | "light" {
	try {
		return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
	} catch {
		return "dark";
	}
}

function applyTheme(theme: "dark" | "light") {
	document.documentElement.classList.toggle("light", theme === "light");
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {}
}

// SideLink renders a sidebar nav item. When the sidebar is collapsed only the
// icon is shown (with a tooltip for its label). `active` overrides NavLink's
// prefix matching so overlapping routes (e.g. /app/admin vs /app/admin/users)
// never highlight two items at once.
function SideLink({
	to,
	icon,
	label,
	end,
	collapsed,
	active,
}: {
	to: string;
	icon: ReactNode;
	label: string;
	end?: boolean;
	collapsed: boolean;
	active?: boolean;
}) {
	return (
		<NavLink
			to={to}
			end={end}
			title={collapsed ? label : undefined}
			className={({ isActive }) =>
				`sap-nav ${(active ?? isActive) ? "sap-nav-active" : ""} ${collapsed ? "justify-center" : ""}`
			}
		>
			{icon}
			{!collapsed ? <span>{label}</span> : null}
		</NavLink>
	);
}

export default function AppPage() {
	const { authed, user, role, isReviewer: reviewer } = useSession();
	const [theme, setTheme] = useState<"dark" | "light">(initialTheme);
	const [collapsedPref, setCollapsed] = useState(() => {
		try {
			return localStorage.getItem(SIDEBAR_KEY) === "1";
		} catch {
			return false;
		}
	});
	// On phones the sidebar is a drawer opened from the top bar; it is never
	// collapsed to icons there.
	const isMobile = useIsMobile();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const collapsed = collapsedPref && !isMobile;
	const username = user?.username || "";
	const location = useLocation();
	const { t } = useTranslation();
	const path = location.pathname;

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Close the drawer after navigating, and on Escape.
	useEffect(() => {
		setDrawerOpen(false);
	}, [path]);
	useEffect(() => {
		if (!drawerOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setDrawerOpen(false);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [drawerOpen]);

	// Refresh the stored role from the server so a promotion to reviewer/admin
	// (or a demotion) takes effect without logging out and back in. Reviewers
	// get the admin overview menu; users/donations stay admin-only (see
	// RequireRole in the route config).
	useRoleRefresh();

	// Simple dark/light toggle: the theme class on <html> flips instantly and
	// Tailwind's color variables repaint the whole app.
	const toggleTheme = () => {
		setTheme(theme === "light" ? "dark" : "light");
	};

	// Collapse/expand the sidebar; the state is persisted so it survives reloads.
	const toggleCollapsed = () => {
		setCollapsed((c) => {
			const next = !c;
			try {
				localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
			} catch {}
			return next;
		});
	};

	return (
		<div className="flex min-h-screen max-md:flex-col">
			{/* Phone top bar: brand and the button that opens the sidebar drawer. */}
			<header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-[var(--color-base-300)] bg-[var(--color-base-200)]">
				<Link to="/app/home" className="flex items-center gap-2.5">
					<span
						className="isotype-mask h-6 w-6 shrink-0 text-[var(--color-primary-soft)]"
						aria-hidden="true"
					/>
					<span className="font-brand uppercase tracking-tight text-lg leading-none">
						<span className="font-bold">Neo</span>
						<span className="font-normal">Assets</span>
					</span>
				</Link>
				<button
					type="button"
					className="btn btn-ghost btn-sm btn-square"
					onClick={() => setDrawerOpen(true)}
					aria-label={t("nav.expandMenu")}
					aria-expanded={drawerOpen}
					aria-controls="app-sidebar"
				>
					<Menu className="w-5 h-5" />
				</button>
			</header>
			{drawerOpen ? (
				<div
					className="md:hidden fixed inset-0 z-40 bg-black/50"
					onClick={() => setDrawerOpen(false)}
					aria-hidden="true"
				/>
			) : null}
			{/* Sidebar */}
			<aside
				id="app-sidebar"
				className={`sap-sidebar shrink-0 sticky top-0 h-screen flex flex-col gap-1 overflow-y-auto transition-[width,transform] duration-200 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72 max-md:p-4 ${drawerOpen ? "" : "max-md:-translate-x-full"} ${collapsed ? "sap-collapsed w-16 p-2" : "w-64 p-4"}`}
			>
				<div className={`flex items-center gap-2 mb-4 ${collapsed ? "flex-col" : ""}`}>
					<Link to="/app/home" className="flex items-center gap-2.5 min-w-0">
						<span
							className="isotype-mask h-7 w-7 shrink-0 text-[var(--color-primary-soft)]"
							aria-hidden="true"
						/>
						{!collapsed ? (
							<span className="font-brand inline-block uppercase tracking-tight text-xl leading-none">
								<span className="font-bold">Neo</span>
								<span className="font-normal">Assets</span>
							</span>
						) : null}
					</Link>
					<button
						type="button"
						onClick={isMobile ? () => setDrawerOpen(false) : toggleCollapsed}
						title={collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
						aria-label={collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
						className={`sap-icon-btn ${collapsed ? "" : "ml-auto w-10"}`}
					>
						{isMobile ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
					</button>
				</div>

				<div className="space-y-1">
					{!collapsed ? <p className="sap-section">{t("nav.menu")}</p> : null}
					<SideLink
						to="/app/home"
						icon={<Home className="w-4 h-4 shrink-0" />}
						label={t("nav.home")}
						collapsed={collapsed}
					/>
					<SideLink
						to="/app/dashboard"
						icon={<LayoutDashboard className="w-4 h-4 shrink-0" />}
						label={t("nav.dashboard")}
						collapsed={collapsed}
					/>
				</div>

				<div className="sap-divider" />

				<div className="space-y-1">
					{!collapsed ? <p className="sap-section">{t("nav.submissions")}</p> : null}
					<SideLink
						to="/app/metadata"
						icon={<Gamepad2 className="w-4 h-4 shrink-0" />}
						label={t("nav.gameMetadata")}
						active={path === "/app/metadata" || path.startsWith("/app/metadata/")}
						collapsed={collapsed}
					/>
					<SideLink
						to="/app/sap"
						icon={<Palette className="w-4 h-4 shrink-0" />}
						label={t("nav.systemArtPack")}
						end
						collapsed={collapsed}
					/>
					{authed ? (
						<SideLink
							to="/app/contributions"
							icon={<ListChecks className="w-4 h-4 shrink-0" />}
							label={t("nav.myReviews")}
							collapsed={collapsed}
						/>
					) : null}
				</div>

				{/* Help */}
				<div className="sap-divider" />
				<div className="space-y-1">
					{!collapsed ? <p className="sap-section">{t("nav.help")}</p> : null}
					<SideLink
						to="/app/guide"
						icon={<HelpCircle className="w-4 h-4 shrink-0" />}
						label={t("nav.rewardsGuide")}
						collapsed={collapsed}
					/>
					<SideLink
						to="/app/docs"
						icon={<Terminal className="w-4 h-4 shrink-0" />}
						label={t("nav.apiDocs")}
						collapsed={collapsed}
					/>
					{authed ? (
						<SideLink
							to="/app/developer"
							icon={<KeyRound className="w-4 h-4 shrink-0" />}
							label={t("nav.developer")}
							collapsed={collapsed}
						/>
					) : null}
					<LanguageSelect collapsed={collapsed} />
				</div>

				<div className="flex-1" />

				{/* Admin */}
				{reviewer ? (
					<>
						<div className="sap-divider" />
						<div className="space-y-1">
							{!collapsed ? <p className="sap-section">{t("nav.admin")}</p> : null}
							<SideLink
								to="/app/admin"
								icon={<LayoutGrid className="w-4 h-4 shrink-0" />}
								label={t("nav.adminOverview")}
								collapsed={collapsed}
							/>
						</div>
					</>
				) : null}

				{/* Account */}
				<div className="sap-divider" />
				{authed ? (
					<div className="space-y-2">
						{!collapsed ? (
							<div className="px-2">
								<p className="text-sm font-semibold truncate">{username}</p>
								<p className="text-xs text-[var(--color-base-content)]/60 mt-0.5">
									{t("common.role")}: <span className="font-medium capitalize">{role}</span>
								</p>
							</div>
						) : null}
						<div className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
							<NavLink
								to="/app/profile"
								title={t("nav.profile")}
								className={`sap-icon-btn ${location.pathname === "/app/profile" ? "sap-icon-btn-active" : ""}`}
							>
								<User className="w-4 h-4" />
							</NavLink>
							<NotificationBell />
							<button
								className="sap-icon-btn"
								type="button"
								title={theme === "light" ? t("nav.switchToDark") : t("nav.switchToLight")}
								onClick={toggleTheme}
							>
								{theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
							</button>
							<button
								className="sap-icon-btn"
								type="button"
								title={t("nav.logout")}
								onClick={() => {
									void signOut();
								}}
							>
								<LogOut className="w-4 h-4" />
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-2 pt-2">
						{!collapsed ? (
							<p className="text-xs text-[var(--color-base-content)]/60 px-2">
								{t("nav.signInToContribute")}
							</p>
						) : null}
						<Link to="/app/register" className="sap-auth-btn" title={t("nav.createAccount")}>
							<UserPlus className="w-4 h-4 shrink-0" />
							{!collapsed ? t("nav.createAccount") : null}
						</Link>
						<div className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
							<Link to="/app/login" className="sap-auth-btn-outline" title={t("nav.signIn")}>
								<LogIn className="w-4 h-4 shrink-0" />
								{!collapsed ? t("nav.signIn") : null}
							</Link>
							<button
								className="sap-icon-btn"
								type="button"
								title={theme === "light" ? t("nav.switchToDark") : t("nav.switchToLight")}
								onClick={toggleTheme}
							>
								{theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
							</button>
						</div>
					</div>
				)}
			</aside>

			{/* Content */}
			<div className="flex-1 min-w-0 flex flex-col">
				<main className="flex-1 w-full px-4 md:px-8 py-8 md:py-10 max-w-6xl mx-auto">
					<Suspense fallback={<PageFallback />}>
						<Outlet />
					</Suspense>
				</main>

				{/* App footer */}
				<footer className="shrink-0 border-t border-[var(--color-base-300)] py-4">
					<div className="w-full px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
						<p className="text-xs text-base-content/60">{t("footer.tagline")}</p>
						<div className="flex items-center gap-4 text-xs text-base-content/60">
							<a
								href="https://neostation.dev"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-base-content"
							>
								NeoStation Frontend
							</a>
							<a
								href="https://discord.gg/xE2kgKsRVq"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-base-content"
							>
								Discord
							</a>
							<a
								href="https://www.patreon.com/cw/NeoAssets"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-base-content"
							>
								Patreon
							</a>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}

// NotificationBell shows the unread review count and opens the review list.
function NotificationBell() {
	const { t } = useTranslation();
	const { unread } = useReviews();
	const { pathname } = useLocation();
	return (
		<NavLink
			to="/app/contributions"
			title={t("nav.notifications")}
			className={`sap-icon-btn relative ${pathname === "/app/contributions" ? "sap-icon-btn-active" : ""}`}
		>
			<Bell className="w-4 h-4" />
			{unread > 0 ? (
				<span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-[var(--color-error)] text-white text-[10px] font-bold grid place-items-center">
					{unread > 9 ? "9+" : unread}
				</span>
			) : null}
		</NavLink>
	);
}

// PageFallback is shown in the content area while a page's code loads.
function PageFallback() {
	return (
		<div className="flex justify-center py-16" role="status" aria-live="polite">
			<Loader2 className="w-6 h-6 animate-spin text-[var(--color-base-content)]/50" aria-hidden="true" />
		</div>
	);
}
