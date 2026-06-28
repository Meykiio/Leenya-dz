import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const SENTRY_DSN = process.env.VITE_SENTRY_DSN;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
        "img-src 'self' data: https://*.supabase.co",
        "font-src 'self' data: https://fonts.gstatic.com",
        "media-src 'self' https://d8jnt0lcm91z4.cloudfront.net",
        "frame-ancestors 'none'",
        "base-uri 'self'",
      ].join("; "),
    },
  },
  build: {
    sourcemap: SENTRY_DSN ? "hidden" : false,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    SENTRY_DSN &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG || "leenya",
        project: process.env.SENTRY_PROJECT || "leenya-web",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
