"use client";

import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emitAck } from "@/services/socket";
import { useMeetingStore } from "@/store/meeting-store";

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const { meeting, self } = useMeetingStore();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [meeting?.messages.length]);

  const send = async () => {
    if (!meeting || !self || !body.trim()) return;
    await emitAck("send-message", { meetingId: meeting.id, participantId: self.id, body });
    setBody("");
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-[#d7c797] bg-white text-foreground">
      <div className="flex items-center justify-between border-b border-border p-4 font-semibold">
        <span>Meeting chat</span>
        {onClose ? (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose} aria-label="Close chat">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {meeting?.messages.map((message) => (
          <div key={message.id} className={message.type === "SYSTEM" ? "text-center text-xs text-muted-foreground" : ""}>
            {message.type === "USER" ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{message.senderName}</span>
                  <span className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">{message.body}</p>
              </>
            ) : (
              <span>{message.body}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <Input placeholder="Send a message" value={body} onChange={(event) => setBody(event.target.value)} />
        <Button size="icon" aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </aside>
  );
}
