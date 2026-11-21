import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// BackLink is the breadcrumb above a page title: a chevron and the name of the
// page it returns to. Every page with a way back uses it, so "back" looks the
// same across the app.
export default function BackLink({ to, label, className = "mb-2" }: { to: string; label: string; className?: string }) {
	return (
		<Link
			to={to}
			className={`inline-flex items-center gap-1 text-sm text-[var(--color-base-content)]/70 hover:text-[var(--color-base-content)] transition-colors ${className}`}
		>
			<ChevronLeft className="w-4 h-4" aria-hidden="true" />
			<span className="truncate">{label}</span>
		</Link>
	);
}
