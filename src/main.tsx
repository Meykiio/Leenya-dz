/**
 * Application entry point.
 * - Initializes Sentry (error tracking)
 * - Loads global styles and i18n
 * - Mounts the React root to #root
 */
import "./lib/sentry";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);
