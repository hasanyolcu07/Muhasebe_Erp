import "./lib/safeInputPatch";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { routes } from "./routes";
import "./index.css";
import { applyUiTheme } from "./modules/ayarlar/utils/applyUiTheme";
import type { UiLanguage, UiTheme } from "./modules/ayarlar/api/sistemAyarlariApi";
import { applyCoaColors, loadLocalCoaSettings } from "./modules/ayarlar/components/tanimlar/HesapPlaniAyarlariPanel";

try {
  const theme = (localStorage.getItem("tabia_ui_theme") || "light") as UiTheme;
  const language = (localStorage.getItem("tabia_ui_lang") || "tr") as UiLanguage;
  applyUiTheme({ theme, language });
  applyCoaColors(loadLocalCoaSettings());
} catch {
  /* ignore */
}

const router = createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
