"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SIGNALING_URL ?? "http://localhost:4000", {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 3000
    });
  }
  return socket;
}

export function emitAck<T>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    getSocket().emit(event, payload, (response: { ok: true; data: T } | { ok: false; error: string }) => {
      if (response.ok) resolve(response.data);
      else reject(new Error(response.error));
    });
  });
}
