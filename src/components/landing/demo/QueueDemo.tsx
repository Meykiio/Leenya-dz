import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const initialQueue = [
  { ticket: "A-13", status: "waiting" as const },
  { ticket: "A-14", status: "waiting" as const },
  { ticket: "A-15", status: "waiting" as const },
  { ticket: "A-16", status: "waiting" as const },
];

let ticketCounter = 17;

export default function QueueDemo() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("A-12");
  const [queue, setQueue] = useState(initialQueue);
  const [history, setHistory] = useState<string[]>([]);
  const [animating, setAnimating] = useState(false);

  const callNext = useCallback(() => {
    if (animating || queue.length === 0) return;
    setAnimating(true);

    const [next, ...rest] = queue;
    setHistory((h) => [current, ...h]);
    setCurrent(next.ticket);
    setQueue(rest);

    setTimeout(() => setAnimating(false), 600);
  }, [animating, queue, current]);

  const addWalkIn = useCallback(() => {
    const ticket = `A-${ticketCounter++}`;
    setQueue((q) => [...q, { ticket, status: "waiting" as const }]);
  }, []);

  return (
    <div className="select-none pointer-events-auto min-h-[260px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-3 w-3 text-[#7A8BAD]" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A8BAD]">{t("landing:features.demo.queueTitle")}</span>
        </div>
        <button
          onClick={addWalkIn}
          className="text-[8px] px-2 py-1 rounded-[5px] bg-white/[0.06] text-[#7A8BAD] hover:text-[#E8EEFF] transition-colors"
        >
          {t("landing:features.demo.addWalkIn")}
        </button>
      </div>

      <div className="h-16 rounded-[12px] border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.13)] flex items-center justify-between px-4 mb-3" style={{ borderInlineStartWidth: "2px", borderInlineStartStyle: "solid", borderInlineStartColor: "#3B82F6" }}>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#7A8BAD]">{t("landing:features.demo.currentlyServing")}</div>
          <motion.div
            key={current}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-xl font-medium text-[#3B82F6] mt-0.5"
          >
            {current}
          </motion.div>
        </div>
        <button
          onClick={callNext}
          disabled={animating || queue.length === 0}
          className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-[5px] bg-[#FF4D2E] text-white font-medium transition-all duration-150 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t("landing:features.demo.callNext")}
          <ArrowRight className="h-3 w-3 rtl:scale-x-[-1]" />
        </button>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <AnimatePresence mode="popLayout">
          {queue.map((item, i) => (
            <motion.div
              key={item.ticket}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 h-7 rounded-[5px] bg-white/[0.03] border border-[#263044] px-2.5"
            >
              <span className="font-mono text-[10px] text-[#7A8BAD] w-12">{item.ticket}</span>
              <div className="flex-1" />
              <span className="text-[8px] text-[#5A6C90]">{t("landing:features.demo.waiting")}</span>
              {i === 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-2 text-[8px] text-[#5A6C90] text-center">
        {t("landing:features.demo.estWaitTime", { minutes: queue.length * 2 })}
      </div>
    </div>
  );
}