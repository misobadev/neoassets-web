import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasRole, useSession, type Role } from "../lib/session";
import { useNoIndex } from "../lib/seo";

// RequireAuth gates routes that need an account (creating/editing submissions).
// Guests are sent to the in-app login, remembering where they wanted to go.
export default function RequireAuth({ children }: { children: ReactNode }) {
	const location = useLocation();
	const { authed } = useSession();
	useNoIndex();
	if (!authed) {
		return <Navigate to="/app/login" replace state={{ from: location.pathname + location.search }} />;
	}
	return <>{children}</>;
}

// RequireRole gates the review and admin routes: anyone without the role
// (guests included) is sent to redirectTo.
export function RequireRole({
	required,
	redirectTo,
	children,
}: {
	required: Role;
	redirectTo: string;
	children: ReactNode;
}) {
	const session = useSession();
	useNoIndex();
	if (!hasRole(session, required)) return <Navigate to={redirectTo} replace />;
	return <>{children}</>;
}
