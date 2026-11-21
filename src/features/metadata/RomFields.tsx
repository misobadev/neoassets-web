import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../../lib/format";
import type { RomFileFields } from "./romFiles";

// RomDropZone is the drop area / file picker for one ROM dump row.
export function RomDropZone({
	hashing,
	disabled,
	onFile,
}: {
	hashing?: boolean;
	disabled?: boolean;
	onFile: (file: File) => void;
}) {
	const { t } = useTranslation();
	return (
		<label
			className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-base-300)] px-4 py-10 text-sm text-[var(--color-base-content)]/60 cursor-pointer text-center transition-colors hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 ${hashing ? "opacity-60" : ""}`}
			onDragOver={(e) => e.preventDefault()}
			onDrop={(e) => {
				e.preventDefault();
				const f = e.dataTransfer.files?.[0];
				if (f) onFile(f);
			}}
		>
			<Upload className="w-8 h-8" />
			<span className="max-w-md">
				{hashing ? t("metadataSubmit.form.romHashing") : t("metadataSubmit.form.romDrop")}
			</span>
			<input
				type="file"
				className="hidden"
				disabled={disabled || hashing}
				onChange={(e) => {
					const f = e.target.files?.[0] || null;
					if (f) onFile(f);
					e.target.value = "";
				}}
			/>
		</label>
	);
}

const HASHES: { key: "crc" | "md5" | "sha1" | "sha256"; label: string; wide?: boolean }[] = [
	{ key: "crc", label: "CRC" },
	{ key: "md5", label: "MD5" },
	{ key: "sha1", label: "SHA1" },
	{ key: "sha256", label: "SHA256", wide: true },
];

// RomDetails is the editable name, the computed size and hashes, and the
// duplicate warning of one ROM dump row.
export function RomDetails({
	row,
	disabled,
	onNameChange,
}: {
	row: RomFileFields & { duplicate?: boolean };
	disabled?: boolean;
	onNameChange: (name: string) => void;
}) {
	const { t } = useTranslation();
	return (
		<>
			<div>
				<label className="label-text">{t("common.name")}</label>
				<input
					className="input input-sm w-full"
					value={row.name}
					onChange={(e) => onNameChange(e.target.value)}
					disabled={disabled}
				/>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
				<div className="flex items-baseline gap-2 min-w-0">
					<span className="label-text shrink-0">{t("common.size")}</span>
					<span className="font-mono truncate">{row.size ? formatBytes(Number(row.size)) : "-"}</span>
				</div>
				{HASHES.map((h) => (
					<div key={h.key} className={`flex items-baseline gap-2 min-w-0 ${h.wide ? "sm:col-span-2" : ""}`}>
						<span className="label-text shrink-0">{h.label}</span>
						<span className="font-mono truncate">{row[h.key] || "-"}</span>
					</div>
				))}
			</div>
			{row.duplicate ? (
				<p className="text-xs text-[var(--color-error)]">{t("metadataSubmit.form.romDuplicate")}</p>
			) : null}
		</>
	);
}
