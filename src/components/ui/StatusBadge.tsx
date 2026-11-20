import type { ReactNode } from "react";
import { statusBadge } from "../../lib/status";

interface StatusBadgeProps {
	status: string;
	children: ReactNode;
	// fallback is the badge class for an unknown status.
	fallback?: string;
	className?: string;
}

// StatusBadge renders a submission/review status with its shared color.
export default function StatusBadge({ status, children, fallback, className = "" }: StatusBadgeProps) {
	return (
		<span className={`badge ${statusBadge(status, fallback)}${className ? ` ${className}` : ""}`}>{children}</span>
	);
}
