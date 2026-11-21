import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth, { RequireRole } from "./components/RequireAuth";
import AppPage from "./pages/AppPage";
import { ReviewsProvider } from "./lib/reviews";

// Pages load on demand: the first visit only downloads the shell and the page
// it opens. AppPage shows a fallback while a page chunk loads.
const HomeView = lazy(() => import("./pages/HomeView"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const SubmissionsView = lazy(() => import("./pages/SubmissionsView"));
const SapDetailPage = lazy(() => import("./pages/SapDetailPage"));
const SubmissionEditor = lazy(() => import("./components/SubmissionEditor"));
const ContributePage = lazy(() => import("./pages/ContributePage"));
const AdminView = lazy(() => import("./pages/AdminView"));
const AdminSubmissionReview = lazy(() => import("./pages/AdminSubmissionReview"));
const AdminMenu = lazy(() => import("./pages/AdminMenu"));
const MetadataBrowse = lazy(() => import("./pages/MetadataBrowse"));
const MetadataGameDetail = lazy(() => import("./pages/MetadataGameDetail"));
const MetadataSubmissionPage = lazy(() => import("./pages/MetadataSubmissionPage"));
const NewGamePage = lazy(() => import("./pages/NewGamePage"));
const MetadataAdminView = lazy(() => import("./pages/MetadataAdminView"));
const DashboardsPage = lazy(() => import("./pages/DashboardPage"));
const AdminUsersView = lazy(() => import("./pages/AdminUsersView"));
const AdminDonationsView = lazy(() => import("./pages/AdminDonationsView"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage"));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage"));
const DeveloperPage = lazy(() => import("./pages/DeveloperPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));

// AppRoutes is the route table. Account pages use RequireAuth; the review and
// admin pages use RequireRole (reviewers, and admins only for users and
// donations).
export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/app/home" replace />} />
			<Route
				path="/app"
				element={
					<ReviewsProvider>
						<AppPage />
					</ReviewsProvider>
				}
			>
				<Route index element={<Navigate to="/app/home" replace />} />
				<Route path="home" element={<HomeView />} />
				<Route path="login" element={<AuthPage mode="login" />} />
				<Route path="register" element={<AuthPage mode="register" />} />
				<Route path="dashboard" element={<DashboardsPage />} />
				<Route
					path="profile"
					element={
						<RequireAuth>
							<ProfilePage />
						</RequireAuth>
					}
				/>
				<Route path="guide" element={<GuidePage />} />
				<Route path="brand" element={<BrandPage />} />
				<Route path="docs" element={<ApiDocsPage />} />
				<Route
					path="developer"
					element={
						<RequireAuth>
							<DeveloperPage />
						</RequireAuth>
					}
				/>
				<Route path="u/:username" element={<PublicProfilePage />} />
				<Route path="sap" element={<SubmissionsView />} />
				<Route path="sap/:packID" element={<SapDetailPage />} />
				<Route
					path="contributions"
					element={
						<RequireAuth>
							<ReviewsPage />
						</RequireAuth>
					}
				/>
				<Route path="reviews" element={<Navigate to="/app/contributions" replace />} />
				<Route
					path="sap/:packID/contribute"
					element={
						<RequireAuth>
							<ContributePage />
						</RequireAuth>
					}
				/>
				<Route path="submissions" element={<Navigate to="/app/sap" replace />} />
				<Route
					path="submissions/new"
					element={
						<RequireAuth>
							<SubmissionEditor />
						</RequireAuth>
					}
				/>
				<Route
					path="submissions/:id"
					element={
						<RequireAuth>
							<SubmissionEditor />
						</RequireAuth>
					}
				/>
				<Route
					path="admin"
					element={
						<RequireRole required="reviewer" redirectTo="/app/home">
							<AdminMenu />
						</RequireRole>
					}
				/>
				<Route
					path="admin/sap"
					element={
						<RequireRole required="reviewer" redirectTo="/app/home">
							<AdminView />
						</RequireRole>
					}
				/>
				<Route
					path="admin/sap/:id"
					element={
						<RequireRole required="reviewer" redirectTo="/app/home">
							<AdminSubmissionReview />
						</RequireRole>
					}
				/>
				<Route
					path="admin/metadata"
					element={
						<RequireRole required="reviewer" redirectTo="/app/home">
							<MetadataAdminView />
						</RequireRole>
					}
				/>
				<Route
					path="admin/users"
					element={
						<RequireRole required="reviewer" redirectTo="/app/home">
							<RequireRole required="admin" redirectTo="/app/admin">
								<AdminUsersView />
							</RequireRole>
						</RequireRole>
					}
				/>
				<Route
					path="admin/donations"
					element={
						<RequireRole required="reviewer" redirectTo="/app/home">
							<RequireRole required="admin" redirectTo="/app/admin">
								<AdminDonationsView />
							</RequireRole>
						</RequireRole>
					}
				/>
				<Route path="metadata" element={<MetadataBrowse />} />
				<Route
					path="metadata/new"
					element={
						<RequireAuth>
							<NewGamePage />
						</RequireAuth>
					}
				/>
				<Route path="metadata/:systemId" element={<MetadataBrowse />} />
				<Route
					path="metadata/:systemId/new"
					element={
						<RequireAuth>
							<NewGamePage />
						</RequireAuth>
					}
				/>
				<Route path="metadata/:systemId/game/:gameId" element={<MetadataGameDetail />} />
				<Route
					path="metadata/:systemId/game/:gameId/submit"
					element={
						<RequireAuth>
							<MetadataSubmissionPage />
						</RequireAuth>
					}
				/>
				<Route path="metadata/admin" element={<Navigate to="/app/admin/metadata" replace />} />
			</Route>
			<Route path="*" element={<Navigate to="/app/home" replace />} />
		</Routes>
	);
}
