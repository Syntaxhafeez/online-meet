"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emitAck } from "@/services/socket";
import { useMeetingStore } from "@/store/meeting-store";

export function ParticipantsPanel({ onClose }: { onClose?: () => void }) {
  const { meeting, self, pendingRequests, removeRequest } = useMeetingStore();
  const isHost = self?.role === "HOST";

  const decide = async (participantId: string, admit: boolean) => {
    if (!meeting || !self) return;
    await emitAck(admit ? "admit-user" : "reject-user", { meetingId: meeting.id, hostParticipantId: self.id, participantId });
    removeRequest(participantId);
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-[#d7c797] bg-white text-foreground">
      <div className="flex items-center justify-between border-b border-border p-4 font-semibold">
        <span>People</span>
        {onClose ? (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose} aria-label="Close people">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {isHost && pendingRequests.length ? (
        <div className="border-b border-border p-3">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Waiting to join</p>
          {pendingRequests.map((participant) => (
            <div key={participant.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm">{participant.displayName}</span>
              <div className="flex gap-1">
                <Button size="icon" className="h-8 w-8" onClick={() => void decide(participant.id, true)} aria-label="Admit">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => void decide(participant.id, false)} aria-label="Reject">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="space-y-2 p-3">
        {meeting?.participants
          .filter((participant) => participant.status === "ADMITTED")
          .map((participant) => (
            <div key={participant.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
              <span>{participant.displayName}</span>
              <span className="text-xs text-muted-foreground">{participant.role === "HOST" ? "Host" : participant.micEnabled ? "Ready" : "Muted"}</span>
            </div>
          ))}
      </div>
    </aside>
  );
}
