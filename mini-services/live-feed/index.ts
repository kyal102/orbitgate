import { createServer } from "http";
import { Server } from "socket.io";

// ── Types ──────────────────────────────────────────────────────────────────

interface LiveEvent {
  id: string;
  type: "verification" | "system" | "telemetry";
  data: Record<string, unknown>;
  timestamp: string;
}

interface ClientSubscription {
  types: string[];
}

// ── In-memory event store ──────────────────────────────────────────────────

const MAX_EVENTS = 100;
const HISTORY_SIZE = 50;
const eventStore: LiveEvent[] = [];

function addEvent(event: LiveEvent): void {
  eventStore.unshift(event);
  if (eventStore.length > MAX_EVENTS) {
    eventStore.length = MAX_EVENTS;
  }
}

// ── HTTP + Socket.IO server ────────────────────────────────────────────────
// We use path: '/socket.io' so that Socket.IO only captures requests to
// /socket.io/*, leaving /api/event available for the HTTP ingestion endpoint.

const httpServer = createServer((req, res) => {
  // Only handle POST /api/event
  if (req.method === "POST" && req.url === "/api/event") {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const eventType = payload.type || "verification";

        if (!["verification", "system", "telemetry"].includes(eventType)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid event type. Must be verification, system, or telemetry." }));
          return;
        }

        const eventData = (payload.data && typeof payload.data === "object") ? { ...payload.data } as Record<string, unknown> : {};

        const event: LiveEvent = {
          id: (payload.id as string) || (eventData.id as string) || crypto.randomUUID(),
          type: eventType as LiveEvent["type"],
          data: eventData,
          timestamp: (payload.timestamp as string) || (eventData.timestamp as string) || new Date().toISOString(),
        };

        addEvent(event);

        // Broadcast to all subscribed clients
        for (const [socketId, sub] of subscriptions) {
          if (sub.types.length === 0 || sub.types.includes(event.type)) {
            io.to(socketId).emit("event", event);
          }
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, event }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
    });
  } else if (!req.url?.startsWith("/socket.io")) {
    // Only send 404 for non-Socket.IO paths (let Socket.IO handle its own)
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
  // If the URL starts with /socket.io, let it fall through to Socket.IO's handler
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Client subscriptions ───────────────────────────────────────────────────

const subscriptions = new Map<string, ClientSubscription>();

// ── Socket.IO handlers ─────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[live-feed] Client connected: ${socket.id} (total: ${io.engine.clientsCount})`);

  // Default subscription: all types
  subscriptions.set(socket.id, { types: [] });

  // Send last 50 events as history
  const history = eventStore.slice(0, HISTORY_SIZE);
  socket.emit("history", history);

  // Broadcast connected count
  broadcastConnectedCount();

  // Client subscribes to specific event types
  socket.on("subscribe", (data: { types?: string[] }) => {
    const types = Array.isArray(data?.types) ? data.types : [];
    subscriptions.set(socket.id, { types });
    console.log(`[live-feed] ${socket.id} subscribed to: ${types.length === 0 ? "all" : types.join(", ")}`);
  });

  // Client disconnects
  socket.on("disconnect", (reason) => {
    console.log(`[live-feed] Client disconnected: ${socket.id} (${reason})`);
    subscriptions.delete(socket.id);
    broadcastConnectedCount();
  });

  socket.on("error", (err) => {
    console.error(`[live-feed] Socket error (${socket.id}):`, err);
  });
});

function broadcastConnectedCount(): void {
  const count = io.engine.clientsCount;
  io.emit("connected", { count });
}

// ── Start server ───────────────────────────────────────────────────────────

const PORT = 3004;
httpServer.listen(PORT, () => {
  console.log(`[live-feed] OrbitGate Live Feed service running on port ${PORT}`);
  console.log(`[live-feed] HTTP endpoint: POST http://localhost:${PORT}/api/event`);
  console.log(`[live-feed] Socket.IO path: /socket.io`);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string) {
  console.log(`[live-feed] Received ${signal}, shutting down...`);
  io.disconnectSockets(true);
  httpServer.close(() => {
    console.log("[live-feed] Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));