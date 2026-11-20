import { useEffect, useId, useRef, type ReactNode } from "react";

const DEFAULT_OVERLAY = "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, innermost last, so Escape and the focus trap only act on the
// top one when dialogs stack (e.g. a confirmation over a review drawer).
const stack: HTMLElement[] = [];

interface ModalProps {
	children: ReactNode;
	// onClose runs on a backdrop click or Escape. Without it the dialog can only
	// be closed from its own buttons (e.g. while an upload is running).
	onClose?: () => void;
	// className replaces the default overlay classes (z-index, backdrop, layout).
	className?: string;
	// label names the dialog for screen readers when it has no h2/h3 heading.
	label?: string;
}

// Modal is the overlay for every dialog: role="dialog" + aria-modal, the first
// heading as its accessible name, focus moved inside and restored on close,
// Tab kept inside, and Escape/backdrop click calling onClose. The caller
// renders it only while open and supplies the panel as children.
export default function Modal({ children, onClose, className = DEFAULT_OVERLAY, label }: ModalProps) {
	const ref = useRef<HTMLDivElement>(null);
	const headingId = useId();
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const previous = document.activeElement as HTMLElement | null;
		stack.push(el);

		if (!label) {
			const heading = el.querySelector<HTMLElement>("h2, h3");
			if (heading) {
				if (!heading.id) heading.id = headingId;
				el.setAttribute("aria-labelledby", heading.id);
			}
		}
		const first = el.querySelector<HTMLElement>(FOCUSABLE);
		(first ?? el).focus({ preventScroll: true });

		const onKeyDown = (e: KeyboardEvent) => {
			if (stack[stack.length - 1] !== el) return;
			if (e.key === "Escape" && onCloseRef.current) {
				e.stopPropagation();
				onCloseRef.current();
				return;
			}
			if (e.key !== "Tab") return;
			const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
			if (items.length === 0) {
				e.preventDefault();
				return;
			}
			const firstItem = items[0];
			const lastItem = items[items.length - 1];
			if (e.shiftKey && document.activeElement === firstItem) {
				e.preventDefault();
				lastItem.focus();
			} else if (!e.shiftKey && document.activeElement === lastItem) {
				e.preventDefault();
				firstItem.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			const i = stack.lastIndexOf(el);
			if (i >= 0) stack.splice(i, 1);
			if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
		};
	}, [headingId, label]);

	return (
		<div
			ref={ref}
			role="dialog"
			aria-modal="true"
			aria-label={label}
			tabIndex={-1}
			className={className}
			onClick={(e) => {
				if (e.target === e.currentTarget) onCloseRef.current?.();
			}}
		>
			{children}
		</div>
	);
}
