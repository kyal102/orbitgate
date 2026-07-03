"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Bot } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  "Explain LEO vs GEO",
  "How does SGP4 work?",
  "What is Kessler syndrome?",
  "Calculate ISS velocity",
];

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your OrbitGate AI assistant. Ask me anything about orbital mechanics, satellite operations, or space law.",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `msg-${Date.now()}-${msgCounter}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpaceAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---- scroll to bottom on new messages ---- */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  /* ---- focus input when panel opens ---- */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* ---- send message callback ---- */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMsg: ChatMessage = { id: nextId(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const res = await fetch("/api/orbitgate/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: data.reply,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        const errMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping],
  );

  /* ---- submit handler ---- */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage],
  );

  /* ---- quick action handler ---- */
  const handleQuickAction = useCallback(
    (action: string) => {
      sendMessage(action);
    },
    [sendMessage],
  );

  /* ---- keyboard: Escape closes panel ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  /* ---- JSX variables (after all callbacks) ---- */
  const panelVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, y: 24, scale: 0.95, transition: { duration: 0.15, ease: "easeIn" } },
  };

  return (
    <>
      {/* ---- Floating toggle button ---- */}
      <motion.button
        onClick={() => setOpen((p) => !p)}
        className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 flex items-center justify-center transition-colors hover:bg-cyan-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulsing glow ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-cyan-400/30 pointer-events-none" />
        )}
      </motion.button>

      {/* ---- Chat panel ---- */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-24 right-6 z-[9999] w-[400px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-white/10 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 backdrop-blur-2xl shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-hidden"
          >
            {/* ---- Header ---- */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 dark:border-white/10 bg-cyan-500/10">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-cyan-400" />
                </div>
                <h2 className="font-orbitron text-sm font-semibold tracking-wide text-gray-900 dark:text-white">
                  OrbitGate AI Assistant
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ---- Messages ---- */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-cyan-500 text-white rounded-br-md"
                        : "bg-gray-200/80 dark:bg-white/10 dark:text-gray-200 text-gray-800 rounded-bl-md backdrop-blur-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* ---- Typing indicator ---- */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-200/80 dark:bg-white/10 rounded-2xl rounded-bl-md px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ---- Quick actions ---- */}
            <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-white/10 dark:border-white/10">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  disabled={isTyping}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-cyan-500/30 dark:border-cyan-500/30 border-cyan-200 text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {action}
                </button>
              ))}
            </div>

            {/* ---- Input ---- */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-4 py-3 border-t border-white/10 dark:border-white/10"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about orbits, satellites..."
                disabled={isTyping}
                className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isTyping || !input.trim()}
                className="h-9 w-9 rounded-lg bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}