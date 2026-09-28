import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthed } from "../lib/api";

// RequireAuth gates routes that need an account (creating/editing submissions).
// Guests are sent to the in-app login, remembering where they wanted to go.
export default function RequireAuth({ children }: { children: ReactNode }) {
	const location = useLocation();
	if (!isAuthed()) {
		return <Navigate to="/app/login" replace state={{ from: location.pathname + location.search }} />;
	}
	return <>{children}</>;
}