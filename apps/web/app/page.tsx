"use client";

import { useMutation } from "@tanstack/react-query";
import { CalendarPlus, Link2, Plus, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMeeting } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const mutation = useMutation({
    mutationFn: () => createMeeting(displayName),
    onSuccess: ({ meetingId, hostParticipantId }) => {
      sessionStorage.setItem(`host:${meetingId}`, hostParticipantId);
      sessionStorage.setItem("displayName", displayName);
      router.push(`/meeting/${meetingId}`);
    }
  });

  const canStart = displayName.trim().length > 0;

  return (
    <main className="min-h-screen bg-[#fbf5e8] text-[#17120a]">
      <header className="flex h-16 items-center justify-between border-b border-[#d7c797] bg-white px-5 shadow-sm md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Video className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold text-[#17120a]">Online Meet</span>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-[1fr_420px] md:px-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-normal text-[#17120a] md:text-6xl">Video meetings for everyone</h1>
          <p className="mt-5 text-lg leading-8 text-[#51483d]">
            Start a secure meeting instantly, admit people as they arrive, share your screen, and keep the conversation flowing with real-time chat.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input placeholder="Your display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            <Button disabled={!canStart || mutation.isPending} onClick={() => mutation.mutate()}>
              <Plus className="h-4 w-4" />
              <span className="text-current">Start Instant Meeting</span>
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" disabled>
              <CalendarPlus className="h-4 w-4" />
              <span className="text-current">Schedule Meeting</span>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-[#d7c797] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#17120a]">
            <Link2 className="h-4 w-4" />
            Join Existing Meeting
          </div>
          <div className="mt-4 grid gap-3">
            <Input placeholder="abc-defg-hij" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toLowerCase())} />
            <Button variant="secondary" disabled={!joinCode.trim()} onClick={() => router.push(`/meeting/${joinCode.trim()}`)}>
              <span className="text-current">Join</span>
            </Button>
          </div>
          {mutation.error ? <p className="mt-3 text-sm text-destructive">{mutation.error.message}</p> : null}
        </div>
      </section>
    </main>
  );
}
