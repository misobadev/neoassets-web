import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchPackDetail, type PackDetail } from "../lib/api";
import SubmissionEditor from "../components/SubmissionEditor";

// ContributePage loads an approved pack and renders the submission editor in
// contribution mode, so the user can add images/description to that pack.
export default function ContributePage() {
	const { packID } = useParams();
	const { t } = useTranslation();
	const [pack, setPack] = useState<PackDetail | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!packID) return;
		fetchPackDetail(packID)
			.then(setPack)
			.catch(() => setError(t("contribute.packNotFound")));
	}, [packID, t]);

	if (error) {
		return (
			<div className="space-y-4">
				<Link to="/app/sap" className="link text-sm inline-flex items-center gap-1">
					<ChevronLeft className="w-4 h-4" />
					{t("submissions.editor.back")}
				</Link>
				<p className="text-sm text-[var(--color-error)]">{error}</p>
			</div>
		);
	}
	if (!pack) return <p className="text-sm text-[var(--color-base-content)]/50 py-6 text-center">{t("common.loading")}</p>;
	return <SubmissionEditor basePack={pack} />;
}