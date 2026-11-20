import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import AppRoutes from "./routes";
import { i18nReady } from "./i18n";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";

// Render once the visitor's language is loaded (English is bundled, so this is
// immediate for English).
void i18nReady.then(() => {
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<BrowserRouter>
				<Layout>
					<AppRoutes />
				</Layout>
			</BrowserRouter>
		</StrictMode>,
	);
});
