import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCw, Ticket, Bell, User } from "lucide-react";

const stuckPhrases = [
  "landing:404.phrase1",
  "landing:404.phrase2",
  "landing:404.phrase3",
  "landing:404.phrase4",
  "landing:404.phrase5",
  "landing:404.phrase6",
];

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#7A8BAD"];

function Glitch404() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const t = setInterval(() => {
      setOffset({
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 4,
      });
      setTimeout(() => setOffset({ x: 0, y: 0 }), 100);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative select-none">
      <div
        className="text-[120px] md:text-[180px] font-bold leading-none tracking-tighter text-foreground/5 absolute inset-0 flex items-center justify-center blur-sm"
        aria-hidden
      >
        404
      </div>
      <div className="relative flex items-center justify-center">
        <motion.span
          className="text-[120px] md:text-[180px] font-bold leading-none tracking-tighter text-primary"
          animate={{ x: offset.x, y: offset.y }}
          transition={{ duration: 0.05 }}
        >
          4
        </motion.span>
        <motion.span
          className="text-[120px] md:text-[180px] font-bold leading-none tracking-tighter text-primary"
          animate={{
            x: -offset.x,
            y: -offset.y,
            opacity: [1, 0.3, 1],
          }}
          transition={{ duration: 0.05 }}
        >
          0
        </motion.span>
        <motion.span
          className="text-[120px] md:text-[180px] font-bold leading-none tracking-tighter text-primary"
          animate={{ x: offset.y, y: offset.x }}
          transition={{ duration: 0.05 }}
        >
          4
        </motion.span>
      </div>
    </div>
  );
}

function TicketRollMiniGame() {
  const { t } = useTranslation();
  const [pulled, setPulled] = useState<number[]>([]);
  const [spinning, setSpinning] = useState(false);

  const pull = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    const next = 405 + pulled.length;
    setPulled((prev) => [...prev, next]);
    setTimeout(() => setSpinning(false), 600);
  }, [spinning, pulled.length]);

  return (
    <div className="text-center">
      <AnimatePresence mode="popLayout">
        {pulled.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <p className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-wider mb-2">
              {t("landing:404.ticketsPulled")}
            </p>
            <div className="flex flex-wrap justify-center gap-1 max-w-[200px] mx-auto">
              {pulled.map((n, i) => (
                <motion.span
                  key={n}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: i * 0.03 }}
                  className="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-[var(--bg-muted)] border border-[var(--border-default)] text-[10px] font-mono text-[var(--text-secondary)]"
                >
                  #{n}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={pull}
        disabled={spinning}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[5px] border border-dashed border-[var(--border-default)] text-[var(--text-secondary)] text-[12px] hover:text-foreground hover:border-[var(--border-strong)] hover:bg-[var(--bg-muted)] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
      >
        <Ticket className="h-3.5 w-3.5" />
        {t("landing:404.pullNewTicket")}
      </motion.button>
    </div>
  );
}

function QueueSimulation() {
  const { t } = useTranslation();
  const [called, setCalled] = useState(0);
  const [message, setMessage] = useState(() => t("landing:404.noAnswer"));

  const callNext = () => {
    setCalled((c) => c + 1);
    const msgs = [
      t("landing:404.stillNoAnswer"),
      t("landing:404.clientLeft"),
      t("landing:404.noShow"),
      t("landing:404.ticketAbsent", { num: 404 + called + 1 }),
      t("landing:404.neverEnds"),
    ];
    setMessage(msgs[called % msgs.length]);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <motion.div
          className="h-8 w-8 rounded-full bg-[var(--accent-light)] border border-[var(--badge-blue-border)] flex items-center justify-center"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <User className="h-4 w-4 text-primary" />
        </motion.div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary">#404</span>
            <span className="text-[10px] text-muted-foreground/40">{t("landing:404.waiting")}</span>
          </div>
          <div className="h-1 w-20 rounded-full bg-[var(--bg-muted)] mt-1 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary/40"
              animate={{ width: ["30%", "70%", "30%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-[11px] text-muted-foreground/50 italic"
        >
          {message}
        </motion.p>
      </AnimatePresence>

      <motion.button
        onClick={callNext}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent-light)] border border-primary/30 text-primary text-[11px] font-medium hover:bg-[var(--accent-light)] transition-all"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="h-3 w-3" />
        {t("landing:404.callNext")}
      </motion.button>

      {called > 2 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] text-muted-foreground/30"
        >
          {t("landing:404.calledNoShow", { count: called })}
        </motion.p>
      )}
    </div>
  );
}

function FloatingQueueDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full"
          style={{
            backgroundColor: COLORS[i % COLORS.length],
            left: `${10 + (i * 4) % 80}%`,
            top: `${5 + (i * 7) % 90}%`,
          }}
          animate={{
            y: [0, -20 - Math.random() * 20, 0],
            opacity: [0, 0.3 + Math.random() * 0.4, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 4,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * 404 page — animated glitch-style error page with queue-themed mini-games.
 * Logs the missing path in dev and displays translation-driven stuck phrases.
 * @returns The 404 page JSX
 */
const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (import.meta.env.DEV) console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const t = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % stuckPhrases.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--bg-base)] relative overflow-hidden">
      <header className="h-14 border-b border-[var(--border-default)] flex items-center px-6 relative z-10">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-primary font-mono text-[13px] font-medium text-primary-foreground tracking-[-0.04em]">
            Ln
          </span>
          <span className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
            Leenya<span className="text-[var(--signal)]">.</span>
          </span>
        </Link>
      </header>

      <FloatingQueueDots />

      <div className="flex-1 flex items-center justify-center px-6 relative z-10 py-12">
        <div className="flex flex-col xl:flex-row items-center gap-12 xl:gap-20 max-w-5xl mx-auto">
          {/* Left: Glitch 404 + queue simulation */}
          <div className="flex flex-col items-center gap-6">
            <Glitch404 />

            <div className="h-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={phraseIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-[12px] text-muted-foreground/40 italic"
                >
                  {t(stuckPhrases[phraseIdx])}
                </motion.p>
              </AnimatePresence>
            </div>

            <QueueSimulation />
          </div>

          {/* Right: Info + mini-game */}
          <div className="flex flex-col items-center xl:items-start gap-6 max-w-xs">
            <div className="text-center xl:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 mb-2">
                {t("landing:404.errorTitle")}
              </p>
              <h2 className="font-display text-xl font-extrabold text-foreground tracking-[-0.02em]">
                {t("landing:404.heading")}
              </h2>
              <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
                {t("landing:404.description")}
              </p>
            </div>

            <div className="w-full border-t border-[var(--border-subtle)] pt-4">
              <TicketRollMiniGame />
            </div>

            <div className="w-full border-t border-[var(--border-subtle)] pt-5 flex flex-col gap-2.5">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-[5px] bg-primary text-primary-foreground text-[14px] font-semibold hover:opacity-90 transition-all"
                >
                  {t("landing:404.backToHome")}
                  <ArrowRight className="h-4 w-4 rtl:scale-x-[-1]" />
                </Link>
              </motion.div>
              <a
                href="mailto:sifeddine.meb96@gmail.com"
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-[5px] text-[13px] text-muted-foreground hover:text-foreground transition-all border border-[var(--border-default)] hover:border-[var(--border-strong)]"
              >
                <RefreshCw className="h-3 w-3" />
                {t("landing:404.reportIssue")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
