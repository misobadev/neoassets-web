import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { userToken } from "../lib/api";

// Apply the persisted theme class to <html> before first render so the correct
// light/dark scheme is active everywhere (including the landing page).
function applyStoredTheme() {
	try {
		if (localStorage.getItem("ns-theme") === "light") {
			document.documentElement.classList.add("light");
		} else {
			document.documentElement.classList.remove("light");
		}
	} catch {}
}

export default function Layout({ children }: { children: ReactNode }) {
	const signedIn = !!userToken();
	const { pathname } = useLocation();
	const { t } = useTranslation();
	useEffect(() => {
		applyStoredTheme();
	}, []);
	// The app has its own sidebar chrome, so the marketing header is only shown
	// on the landing page. The app gets a fixed footer instead.
	const isApp = pathname.startsWith("/app");
	return (
		<div className="relative min-h-screen">
			<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000,transparent)]" />
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,color-mix(in_oklab,#4a90e2_18%,transparent),transparent)]" />
			</div>
			<div className="relative z-10 flex min-h-screen flex-col">
				{!isApp ? (
					<header className="sticky top-0 z-40 h-16 glass border-b border-base-300">
						<div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
							<Link to="/" className="flex items-center gap-2.5 text-base-content">
								<span className="isotype-mask h-9 w-9 shrink-0" aria-hidden="true" />
								<span className="inline-block uppercase tracking-tight text-2xl leading-none"><span className="font-bold">Neo</span><span className="font-normal">Assets</span></span>
							</Link>
							<nav className="flex items-center gap-2">
								<Link to="/" className="btn btn-ghost btn-sm">
									{t("layout.home")}
								</Link>
								{signedIn ? (
									<Link to="/app" className="btn btn-primary btn-sm">
										{t("layout.openApp")}
									</Link>
								) : (
									<Link to="/app" className="btn btn-primary btn-sm">
										{t("layout.signIn")}
									</Link>
								)}
							</nav>
						</div>
					</header>
				) : null}
				<main className="flex-1">{children}</main>
			</div>
		</div>
	);
}
