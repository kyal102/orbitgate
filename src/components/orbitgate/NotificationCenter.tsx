"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellRing,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Radio,
  CheckCheck,
  Trash2,
  HelpCircle,
  FileQuestion,
} from "lucide-react";
import { useOrbitGateStore } from "@/lib/orbitgate-store";
import type { AppNotification } from "@/lib/orbitgate-store";

// Map icon name strings to lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Radio,
  HelpCircle,
  FileQuestion,
};

const TYPE_COLORS: Record<AppNotification["type"], string> = {
  verification: "text-cyan-400",
  system: "text-amber-400",
  telemetry: "text-sky-400",
  info: "text-gray-400",
};

const TYPE_BG: Record<AppNotification["type"], string> = {
  verification: "bg-cyan-500/10",
  system: "bg-amber-500/10",
  telemetry: "bg-sky-500/10",
  info: "bg-gray-500/10",
};

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  if (diff < 5000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function NotificationIcon({
  notification,
}: {
  notification: AppNotification;
}) {
  const color = TYPE_COLORS[notification.type];
  const bg = TYPE_BG[notification.type];
  const IconComp = notification.icon
    ? ICON_MAP[notification.icon]
    : notification.type === "verification"
      ? CheckCircle
      : notification.type === "system"
        ? AlertTriangle
        : notification.type === "telemetry"
          ? Radio
          : Info;

  if (!IconComp) {
    return (
      <div
        className={`h-8 w-8 rounded-lg flex items-center justify-center ${bg} shrink-0`}
      >
        <Info className={`h-4 w-4 ${color}`} />
      </div>
    );
  }

  return (
    <div
      className={`h-8 w-8 rounded-lg flex items-center justify-center ${bg} shrink-0`}
    >
      <IconComp className={`h-4 w-4 ${color}`} />
    </div>
  );
}

function NotificationItem({
  notification,
  onClose,
}: {
  notification: AppNotification;
  onClose: () => void;
}) {
  const markNotificationRead = useOrbitGateStore((s) => s.markNotificationRead);
  const [time, setTime] = useState(relativeTime(notification.timestamp));

  // Update relative time every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(relativeTime(notification.timestamp));
    }, 30_000);
    return () => clearInterval(interval);
  }, [notification.timestamp]);

  const handleClick = () => {
    if (!notification.read) {
      markNotificationRead(notification.id);
    }
    onClose();
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      onClick={handleClick}
      className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60 border-l-2 ${
        notification.read
          ? "border-transparent"
          : "border-cyan-500 bg-cyan-500/[0.03]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <NotificationIcon notification={notification} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-xs font-semibold truncate ${
                notification.read
                  ? "text-gray-500 dark:text-gray-500"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {notification.title}
            </p>
            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono shrink-0">
              {time}
            </span>
          </div>
          <p
            className={`text-[11px] mt-0.5 line-clamp-2 ${
              notification.read
                ? "text-gray-400 dark:text-gray-600"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {notification.message}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const notifications = useOrbitGateStore((s) => s.notifications);
  const markAllRead = useOrbitGateStore((s) => s.markAllRead);
  const clearNotifications = useOrbitGateStore((s) => s.clearNotifications);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <AnimatePresence mode="wait">
          {unreadCount > 0 ? (
            <motion.div
              key="bell-ring"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <BellRing className="h-3.5 w-3.5" />
            </motion.div>
          ) : (
            <motion.div
              key="bell"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Bell className="h-3.5 w-3.5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring when unread */}
        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-md animate-ping bg-cyan-500/20 pointer-events-none" />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-white/95 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl backdrop-blur-md z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors px-1.5 py-0.5 rounded hover:bg-cyan-500/10"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearNotifications()}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-rose-400 transition-colors px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                    title="Clear all notifications"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Bell className="h-8 w-8 text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="text-xs text-gray-400 dark:text-gray-600">
                    No notifications
                  </p>
                  <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-1">
                    Verification results and system alerts will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800/50">
                  <AnimatePresence initial={false}>
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClose={() => setIsOpen(false)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
