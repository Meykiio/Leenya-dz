import * as Sentry from "@sentry/react";

/** Sentry DSN from environment, or undefined to skip initialization. */
const dsn = import.meta.env.VITE_SENTRY_DSN;
/** Current app mode (production, development, etc.). */
const env = import.meta.env.MODE || "development";

/**
 * Initialize Sentry for error tracking and performance monitoring.
 * Only initializes if VITE_SENTRY_DSN is set. Sampling rates are higher
 * in production to capture real user data while keeping dev noise low.
 */
if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === "production" ? 0.2 : 0.0,
    replaysSessionSampleRate: env === "production" ? 0.1 : 0.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  });
}

export default Sentry;
