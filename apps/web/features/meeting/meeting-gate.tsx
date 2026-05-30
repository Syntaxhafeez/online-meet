"use client";

import { useEffect, useState } from "react";
import { Lobby } from "./lobby";
import { MeetingRoom } from "./meeting-room";

export function MeetingGate({ meetingId }: { meetingId: string }) {
  const [participantId, setParticipantId] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setParticipantId(sessionStorage.getItem(`host:${meetingId}`) ?? sessionStorage.getItem(`participant:${meetingId}`) ?? undefined);
    setReady(true);
  }, [meetingId]);

  if (!ready) return null;
  return participantId ? <MeetingRoom meetingId={meetingId} hostParticipantId={participantId} /> : <Lobby meetingId={meetingId} />;
}
