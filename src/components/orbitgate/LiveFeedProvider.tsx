"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useOrbitGateStore } from "@/lib/orbitgate-store";

interface LiveEvent {
  id: string;
  type: "verification" | "system" | "telemetry";
  data: Record<string, unknown>;
  timestamp: string;
}

const BASE_DELAY = 1000;
const MAX_DELAY = 30000;
const MAX_RETRIES = 10;

/**
 * LiveFeedProvider — connects to the OrbitGate live-feed WebSocket mini-service
 * on mount, receives verification/system/telemetry events, and dispatches them
 * to the Zustand store. Shows no UI of its own; parent can read `wsConnected`
 * from the store.
 */
export function LiveFeedProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const setWsConnected = useOrbitGateStore((s) => s.setWsConnected);
  const setWsConnectedClients = useOrbitGateStore((s) => s.setWsConnectedClients);
  const mergeHistoryEntries = useOrbitGateStore((s) => s.mergeHistoryEntries);

  useEffect(() => {
    mountedRef.current = true;

    function handleVerificationEvent(eventData: Record<string, unknown>, fallbackTimestamp: string) {
      const d = eventData as {
        id?: string;
        claim?: string;
        decision?: string;
        gate?: string;
        risk_label?: string;
        reason?: string;
        evidence?: string[];
        missing_evidence?: string[];
        timestamp?: string;
      };

      if (d.id && d.claim && d.decision) {
        mergeHistoryEntries([{
          id: d.id,
          claim: d.claim,
          decision: d.decision,
          gate: d.gate || "Unknown",
          risk_label: d.risk_label || "UNKNOWN",
          reason: d.reason || "",
          evidence: Array.isArray(d.evidence) ? d.evidence : [],
          missing_evidence: Array.isArray(d.missing_evidence) ? d.missing_evidence : [],
          timestamp: d.timestamp || fallbackTimestamp,
        }]);
      }
    }

    function connect() {
      // Clean up existing socket if any
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const socket = io("/?XTransformPort=3004", {
        transports: ["websocket", "polling"],
        reconnection: false, // We handle reconnection ourselves
        timeout: 10000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        if (!mountedRef.current) return;
        retryCountRef.current = 0;
        setWsConnected(true);
      });

      socket.on("history", (events: LiveEvent[]) => {
        if (!mountedRef.current) return;
        const verificationEvents = events
          .filter((e) => e.type === "verification" && e.data)
          .map((e) => e.data)
          .filter((d) => d.id && d.claim && d.decision);

        if (verificationEvents.length > 0) {
          mergeHistoryEntries(verificationEvents as Array<{
            id: string;
            claim: string;
            decision: string;
            gate: string;
            risk_label: string;
            reason: string;
            evidence: string[];
            missing_evidence: string[];
            timestamp: string;
          }>);
        }
      });

      socket.on("event", (event: LiveEvent) => {
        if (!mountedRef.current) return;
        if (event.type === "verification" && event.data) {
          handleVerificationEvent(event.data, event.timestamp);
        }
      });

      socket.on("connected", (data: { count: number }) => {
        if (!mountedRef.current) return;
        setWsConnectedClients(data.count);
      });

      socket.on("disconnect", () => {
        if (!mountedRef.current) return;
        setWsConnected(false);
        setWsConnectedClients(0);
      });

      socket.on("connect_error", () => {
        if (!mountedRef.current) return;
        setWsConnected(false);
        scheduleReconnect();
      });
    }

    function scheduleReconnect() {
      if (!mountedRef.current) return;
      if (retryCountRef.current >= MAX_RETRIES) {
        return;
      }

      const delay = Math.min(BASE_DELAY * 2 ** retryCountRef.current, MAX_DELAY);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      retryCountRef.current += 1;

      retryTimerRef.current = setTimeout(() => {
        connect();
      }, jitter);
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setWsConnected(false);
      setWsConnectedClients(0);
    };
  }, [setWsConnected, setWsConnectedClients, mergeHistoryEntries]);

  return <>{children}</>;
}