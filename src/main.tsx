import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import AppPage from "./pages/AppPage";
import HomeView from "./pages/HomeView";
import AuthPage from "./pages/AuthPage";
import SubmissionsView from "./pages/SubmissionsView";
import SubmissionEditor from "./components/SubmissionEditor";
import ContributePage from "./pages/ContributePage";
import AdminView from "./pages/AdminView";
import AdminSubmissionReview from "./pages/AdminSubmissionReview";
import AdminMenu from "./pages/AdminMenu";
import MetadataBrowse from "./pages/MetadataBrowse";
import MetadataGameDetail from "./pages/MetadataGameDetail";
import MetadataSubmissionPage from "./pages/MetadataSubmissionPage";
import MetadataAdminView from "./pages/MetadataAdminView";
import DashboardsPage from "./pages/DashboardPage";
import AdminUsersView from "./pages/AdminUsersView";
import ProfilePage from "./pages/ProfilePage";
import GuidePage from "./pages/GuidePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import ApiDocsPage from "./pages/ApiDocsPage";
import DeveloperPage from "./pages/DeveloperPage";
import ReviewsPage from "./pages/ReviewsPage";
import { ReviewsProvider } from "./lib/reviews";
import "./i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<Layout>
				<Routes>
					<Route path="/" element={<Navigate to="/app/home" replace />} />
					<Route path="/app" element={<ReviewsProvider><AppPage /></ReviewsProvider>}>
						<Route index element={<Navigate to="/app/home" replace />} />
						<Route path="home" element={<HomeView />} />
						<Route path="login" element={<AuthPage mode="login" />} />
						<Route path="register" element={<AuthPage mode="register" />} />
						<Route path="dashboard" element={<DashboardsPage />} />
						<Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
						<Route path="guide" element={<GuidePage />} />
						<Route path="docs" element={<ApiDocsPage />} />
						<Route path="developer" element={<RequireAuth><DeveloperPage /></RequireAuth>} />
						<Route path="u/:username" element={<PublicProfilePage />} />
						<Route path="sap" element={<SubmissionsView />} />
						<Route path="reviews" element={<RequireAuth><ReviewsPage /></RequireAuth>} />
						<Route path="sap/:packID/contribute" element={<RequireAuth><ContributePage /></RequireAuth>} />
						<Route path="submissions" element={<Navigate to="/app/sap" replace />} />
						<Route path="submissions/new" element={<RequireAuth><SubmissionEditor /></RequireAuth>} />
						<Route path="submissions/:id" element={<RequireAuth><SubmissionEditor /></RequireAuth>} />
						<Route path="admin" element={<RequireAuth><AdminMenu /></RequireAuth>} />
						<Route path="admin/sap" element={<RequireAuth><AdminView /></RequireAuth>} />
						<Route path="admin/sap/:id" element={<RequireAuth><AdminSubmissionReview /></RequireAuth>} />
						<Route path="admin/metadata" element={<RequireAuth><MetadataAdminView /></RequireAuth>} />
						<Route path="admin/users" element={<RequireAuth><AdminUsersView /></RequireAuth>} />
						<Route path="metadata" element={<MetadataBrowse />} />
						<Route path="metadata/:systemId" element={<MetadataBrowse />} />
						<Route path="metadata/:systemId/game/:gameId" element={<MetadataGameDetail />} />
						<Route path="metadata/:systemId/game/:gameId/submit" element={<RequireAuth><MetadataSubmissionPage /></RequireAuth>} />
						<Route path="metadata/admin" element={<Navigate to="/app/admin/metadata" replace />} />
					</Route>
					<Route path="*" element={<Navigate to="/app/home" replace />} />
				</Routes>
			</Layout>
		</BrowserRouter>
	</StrictMode>,
);