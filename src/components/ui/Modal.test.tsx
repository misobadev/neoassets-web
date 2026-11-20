import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Modal from "./Modal";

describe("Modal", () => {
	it("is a labelled dialog and moves focus inside", () => {
		render(
			<Modal onClose={() => {}}>
				<div>
					<h2>Delete pack</h2>
					<button type="button">Cancel</button>
				</div>
			</Modal>,
		);
		const dialog = screen.getByRole("dialog", { name: "Delete pack" });
		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
	});

	it("closes on Escape and on a backdrop click, not on a panel click", () => {
		const onClose = vi.fn();
		render(
			<Modal onClose={onClose}>
				<p>panel</p>
			</Modal>,
		);
		fireEvent.click(screen.getByText("panel"));
		expect(onClose).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("dialog"));
		fireEvent.keyDown(document, { key: "Escape" });
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it("without onClose it cannot be dismissed", () => {
		render(
			<Modal>
				<p>uploading</p>
			</Modal>,
		);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("Escape only closes the top dialog and focus returns to the opener", () => {
		const outer = vi.fn();
		function Harness() {
			const [inner, setInner] = useState(false);
			return (
				<Modal onClose={outer}>
					<button type="button" onClick={() => setInner(true)}>
						open
					</button>
					{inner ? (
						<Modal onClose={() => setInner(false)}>
							<button type="button">confirm</button>
						</Modal>
					) : null}
				</Modal>
			);
		}
		render(<Harness />);
		const opener = screen.getByRole("button", { name: "open" });
		fireEvent.click(opener);
		expect(screen.getByRole("button", { name: "confirm" })).toHaveFocus();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(outer).not.toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: "confirm" })).toBeNull();
		expect(opener).toHaveFocus();
	});
});
