import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// Pagination renders prev/next controls with a page indicator. It is used by
// list pages that paginate client- or server-side.
export default function Pagination({ page, totalPages, disabled, onChange }: { page: number; totalPages: number; disabled?: boolean; onChange: (page: number) => void }) {
	const { t } = useTranslation();
	return (
		<div className="flex items-center justify-between gap-3">
			<button className="btn btn-outline btn-sm" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
				<ChevronLeft className="w-4 h-4" />
				{t("metadata.prev")}
			</button>
			<p className="text-sm text-[var(--color-base-content)]/50">{t("metadata.pageOf", { page, totalPages })}</p>
			<button className="btn btn-outline btn-sm" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>
				{t("metadata.next")}
				<ChevronRight className="w-4 h-4" />
			</button>
		</div>
	);
}
