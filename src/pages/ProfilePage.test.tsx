import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ProfilePage from "./ProfilePage";
import * as api from "../lib/api";

// Keys come back as text, with the email appended when one is passed.
const t = (key: string, opts?: { email?: string }) => (opts?.email ? `${key}:${opts.email}` : key);
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t }) }));

vi.mock("../lib/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../lib/api")>();
	return {
		...actual,
		fetchMe: vi.fn(),
		fetchRewards: vi.fn(),
		fetchAPIKeys: vi.fn(),
		updateProfile: vi.fn(),
		confirmEmailChange: vi.fn(),
		clearStoredAuth: vi.fn(),
		storeCachedUser: vi.fn(),
	};
});

const me: api.User = {
	id: "u1",
	username: "alice",
	email: "alice@example.com",
	role: "user",
	xp: 0,
	donor_status: "none",
	avatar_key: "",
	email_verified: true,
	created_at: "2026-01-01T00:00:00Z",
	updated_at: "2026-01-01T00:00:00Z",
};

function LoginProbe() {
	const state = useLocation().state as { notice?: string } | null;
	return <p>login page {state?.notice}</p>;
}

function renderAt(url: string) {
	return render(
		<StrictMode>
			<MemoryRouter initialEntries={[url]}>
				<Routes>
					<Route path="/app/profile" element={<ProfilePage />} />
					<Route path="/app/login" element={<LoginProbe />} />
				</Routes>
			</MemoryRouter>
		</StrictMode>,
	);
}

describe("ProfilePage email change", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(api.fetchMe).mockResolvedValue(me);
		vi.mocked(api.fetchRewards).mockRejectedValue(new Error("skip"));
		vi.mocked(api.fetchAPIKeys).mockResolvedValue([]);
	});

	it("asks for the current password and shows the pending address", async () => {
		vi.mocked(api.updateProfile).mockResolvedValue({ ...me, pending_email: "new@example.com" });
		renderAt("/app/profile");
		const emailInput = await screen.findByDisplayValue("alice@example.com");
		expect(screen.queryByText("profile.emailPasswordHint")).not.toBeInTheDocument();

		fireEvent.change(emailInput, { target: { value: "new@example.com" } });
		expect(screen.getByText("profile.emailPasswordHint")).toBeInTheDocument();
		const save = screen.getByRole("button", { name: "common.saveChanges" });
		expect(save).toBeDisabled();

		const password = document.querySelector('input[autocomplete="current-password"]') as HTMLInputElement;
		fireEvent.change(password, { target: { value: "secret-pass" } });
		fireEvent.click(save);

		await screen.findByText("profile.emailPending:new@example.com");
		expect(api.updateProfile).toHaveBeenCalledWith({
			username: "alice",
			email: "new@example.com",
			current_password: "secret-pass",
		});
		// The address in use stays until the link is opened.
		expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument();
		expect(screen.getByText("profile.emailPendingHint:new@example.com")).toBeInTheDocument();
	});

	it("sends only the username when the email is unchanged", async () => {
		vi.mocked(api.updateProfile).mockResolvedValue({ ...me, username: "alice2" });
		renderAt("/app/profile");
		fireEvent.change(await screen.findByDisplayValue("alice"), { target: { value: "alice2" } });
		fireEvent.click(screen.getByRole("button", { name: "common.saveChanges" }));
		await screen.findByText("profile.updated");
		expect(api.updateProfile).toHaveBeenCalledWith({ username: "alice2" });
	});

	it("confirms the link once and sends the user to sign in again", async () => {
		vi.mocked(api.confirmEmailChange).mockResolvedValue({ message: "ok" });
		renderAt("/app/profile?confirm-email=tok123");
		await screen.findByText("login page profile.emailChanged");
		expect(api.confirmEmailChange).toHaveBeenCalledTimes(1);
		expect(api.confirmEmailChange).toHaveBeenCalledWith("tok123");
		expect(api.clearStoredAuth).toHaveBeenCalled();
	});

	it("shows why a confirmation link failed", async () => {
		vi.mocked(api.confirmEmailChange).mockRejectedValue(
			new Error("this confirmation link is invalid, has expired or was already used"),
		);
		renderAt("/app/profile?confirm-email=bad");
		await waitFor(() =>
			expect(
				screen.getByText("this confirmation link is invalid, has expired or was already used"),
			).toBeInTheDocument(),
		);
		expect(api.clearStoredAuth).not.toHaveBeenCalled();
	});
});
