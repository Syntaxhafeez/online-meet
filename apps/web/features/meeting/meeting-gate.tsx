"use client";

import { useEffect, useState } from "react";
import { getMeeting } from "@/lib/api";
import { useMeetingStore } from "@/store/meeting-store";
import { Lobby } from "./lobby";
import { MeetingRoom } from "./meeting-room";

export function MeetingGate({ meetingId }: { meetingId: string }) {
  const [participantId, setParticipantId] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    useMeetingStore.getState().resetCall();
    const rememberedId = sessionStorage.getItem(`host:${meetingId}`) ?? sessionStorage.getItem(`participant:${meetingId}`) ?? undefined;
    getMeeting(meetingId)
      .then(() => {
        if (!active) return;
        setParticipantId(rememberedId);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setMissing(true);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [meetingId]);

  if (!ready) return null;
  if (missing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf5e8] p-6 text-center text-[#17120a]">
        <div>
          <h1 className="text-2xl font-semibold">This meeting link is not valid</h1>
          <p className="mt-2 text-[#51483d]">Check the meeting code and try again.</p>
        </div>
      </main>
    );
  }
  return participantId ? <MeetingRoom meetingId={meetingId} hostParticipantId={participantId} /> : <Lobby meetingId={meetingId} />;
}
