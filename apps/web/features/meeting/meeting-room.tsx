"use client";

import { Bell, Camera, CameraOff, Check, Copy, LogOut, MessageSquare, Mic, MicOff, MonitorOff, MonitorUp, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/features/chat/chat-panel";
import { ParticipantsPanel } from "@/features/participants/participants-panel";
import { useMediaDevices } from "@/hooks/use-media-devices";
import { meetMediaClient } from "@/services/mediasoup-client";
import { emitAck, getSocket } from "@/services/socket";
import { useDeviceStore } from "@/store/device-store";
import { useMeetingStore } from "@/store/meeting-store";
import { VideoTile } from "./video-tile";
import { RemoteAudio } from "./remote-audio";

export function MeetingRoom({ meetingId, hostParticipantId }: { meetingId: string; hostParticipantId?: string }) {
  const router = useRouter();
  const { startPreview, toggleMic, toggleCamera } = useMediaDevices();
  const deviceState = useDeviceStore();
  const store = useMeetingStore();
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState("");
  const [toastDismissed, setToastDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const socket = getSocket();
    const onMeetingState = store.setMeeting;
    const onNewMessage = store.addMessage;
    const onParticipantUpdated = (participant: NonNullable<typeof store.self>) => {
      const meeting = useMeetingStore.getState().meeting;
      if (meeting) store.setMeeting({ ...meeting, participants: meeting.participants.map((p) => (p.id === participant.id ? participant : p)) });
    };
    const onJoinRequested = (participant: NonNullable<typeof store.self>) => {
      store.addRequest(participant);
      setToastDismissed(false);
      playJoinRequestTone();
    };
    const onUserLeft = ({ participantId }: { participantId: string }) => {
      meetMediaClient.removeParticipant(participantId);
      store.removeParticipant(participantId);
    };
    const onProducerClosed = ({ participantId, source }: { participantId: string; source: string }) => {
      meetMediaClient.removeParticipantSource(participantId, source);
      store.removeParticipantMediaSource(participantId, source);
    };
    socket.on("meeting-state", onMeetingState);
    socket.on("new-message", onNewMessage);
    socket.on("participant-updated", onParticipantUpdated);
    socket.on("join-requested", onJoinRequested);
    socket.on("user-left", onUserLeft);
    socket.on("mediasoup:producer-closed", onProducerClosed);

    async function boot() {
      try {
        const existingStream = useMeetingStore.getState().localStream;
        const stream = existingStream?.getTracks().some((track) => track.readyState === "live") ? existingStream : await startPreview();
        const join = await emitAck<{ participant: typeof store.self; meeting: typeof store.meeting }>("join-meeting", { meetingId, participantId: hostParticipantId });
        if (!mounted || !join.participant) return;
        store.setSelf(join.participant);
        store.setMeeting(join.meeting);
        await meetMediaClient.join(meetingId, join.participant.id, stream);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to join");
      } finally {
        setJoining(false);
      }
    }
    void boot();
    return () => {
      mounted = false;
      socket.off("meeting-state", onMeetingState);
      socket.off("new-message", onNewMessage);
      socket.off("participant-updated", onParticipantUpdated);
      socket.off("join-requested", onJoinRequested);
      socket.off("user-left", onUserLeft);
      socket.off("mediasoup:producer-closed", onProducerClosed);
      const current = useMeetingStore.getState();
      if (current.self) void emitAck("leave-meeting", { meetingId, participantId: current.self.id }).catch(() => undefined);
      meetMediaClient.close();
      current.localStream?.getTracks().forEach((track) => track.stop());
      current.screenStream?.getTracks().forEach((track) => track.stop());
      current.resetCall();
    };
  }, []);

  const participants = store.meeting?.participants.filter((participant) => participant.status === "ADMITTED") ?? [];
  const remoteVideos = store.remotes.filter((remote) => remote.kind === "video");
  const remoteAudios = store.remotes.filter((remote) => remote.kind === "audio");
  const remoteParticipants = participants.filter((participant) => participant.id !== store.self?.id);
  const tileCount = Math.max(1, participants.length);
  const gridClass = tileCount <= 2 ? "sm:grid-cols-2" : tileCount <= 4 ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3";
  const selfName = store.self?.displayName ?? sessionStorage.getItem("displayName") ?? "You";
  const copyLink = () => void navigator.clipboard.writeText(`${window.location.origin}/${meetingId}`);
  const firstRequest = store.pendingRequests[0];
  const isHost = store.self?.role === "HOST";

  const remoteScreen = useMemo(() => remoteVideos.find((remote) => remote.appData?.source === "screen"), [remoteVideos]);
  const primaryScreen = store.screenStream
    ? { stream: store.screenStream, name: `${selfName}'s presentation`, participantId: store.self?.id }
    : remoteScreen
      ? { stream: remoteScreen.stream, name: `${participants.find((participant) => participant.id === remoteScreen.participantId)?.displayName ?? "Guest"}'s presentation`, participantId: remoteScreen.participantId }
      : undefined;

  const stopScreenShare = async () => {
    const current = useMeetingStore.getState();
    if (!current.self || !current.screenStream) return;
    current.screenStream.getTracks().forEach((track) => track.stop());
    meetMediaClient.stopScreen();
    current.setScreenStream(undefined);
    await emitAck("stop-screen-share", { meetingId, participantId: current.self.id });
  };

  const shareScreen = async () => {
    if (!store.self) return;
    if (store.screenStream) {
      await stopScreenShare();
      return;
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    store.setScreenStream(stream);
    await meetMediaClient.publishScreen(meetingId, store.self.id, stream);
    await emitAck("start-screen-share", { meetingId, participantId: store.self.id });
    stream.getVideoTracks()[0]?.addEventListener("ended", () => void stopScreenShare(), { once: true });
  };

  const leaveMeeting = async () => {
    const current = useMeetingStore.getState();
    if (current.self) await emitAck("leave-meeting", { meetingId, participantId: current.self.id }).catch(() => undefined);
    meetMediaClient.close();
    current.resetCall();
    router.push("/");
  };

  const decideRequest = async (participantId: string, admit: boolean) => {
    if (!store.meeting || !store.self) return;
    await emitAck(admit ? "admit-user" : "reject-user", { meetingId: store.meeting.id, hostParticipantId: store.self.id, participantId });
    store.removeRequest(participantId);
    if (store.pendingRequests.length <= 1) setToastDismissed(true);
  };

  if (joining) return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Joining meeting...</div>;
  if (error) return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-destructive">{error}</div>;

  return (
    <main className="relative flex h-screen overflow-hidden bg-[#17130d] text-white">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-16 items-center justify-between border-b border-[#d7c797] bg-[#fffaf0] px-4 py-3 text-sm text-[#211706] shadow-sm sm:px-5">
          <span className="font-semibold text-[#211706]">{meetingId}</span>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
        </div>

        <div className="min-h-0 flex-1 bg-[#17130d] p-2 sm:p-3">
          {primaryScreen ? (
            <div className="grid h-full gap-3 lg:grid-cols-[1fr_260px]">
              <VideoTile name={primaryScreen.name} stream={primaryScreen.stream} isScreen className="h-full" />
              <div className="grid content-start gap-3 overflow-y-auto">
                <VideoTile name={selfName} stream={store.localStream} muted micEnabled={deviceState.micEnabled} videoEnabled={deviceState.cameraEnabled} className="aspect-video" />
                {remoteParticipants.map((participant) => (
                  <VideoTile
                    key={participant.id}
                    name={participant.displayName}
                    stream={remoteVideos.find((remote) => remote.participantId === participant.id && remote.appData?.source === "camera")?.stream}
                    micEnabled={participant.micEnabled}
                    videoEnabled={participant.cameraEnabled}
                    className="aspect-video"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className={`grid h-full grid-cols-1 content-center items-center gap-2 sm:gap-3 ${gridClass}`}>
              <VideoTile name={selfName} stream={store.localStream} muted micEnabled={deviceState.micEnabled} videoEnabled={deviceState.cameraEnabled} className="aspect-video max-h-full" />
              {remoteParticipants.map((participant) => (
                <VideoTile
                  key={participant.id}
                  name={participant.displayName}
                  stream={remoteVideos.find((remote) => remote.participantId === participant.id && remote.appData?.source === "camera")?.stream}
                  micEnabled={participant.micEnabled}
                  videoEnabled={participant.cameraEnabled}
                  className="aspect-video max-h-full"
                  onPin={() => store.setPinnedParticipantId(participant.id)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="hidden">
          {remoteAudios.map((remote) => (
            <RemoteAudio key={remote.id} stream={remote.stream} />
          ))}
        </div>

        {isHost && firstRequest && !toastDismissed ? (
          <div className="absolute left-1/2 top-20 z-40 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-[#d8bd63] bg-[#fffaf0] p-3 text-[#211706] shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{firstRequest.displayName} wants to join</p>
                <p className="mt-1 text-sm text-muted-foreground">Admit them to this meeting?</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => void decideRequest(firstRequest.id, true)}>
                    <Check className="h-4 w-4" />
                    Admit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void decideRequest(firstRequest.id, false)}>
                    Ignore
                  </Button>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setToastDismissed(true)} aria-label="Dismiss request">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-20 flex-wrap items-center justify-center gap-2 border-t border-[#d7c797] bg-[#fffaf0] px-2 py-3 shadow-[0_-1px_18px_rgba(0,0,0,0.22)] sm:gap-3 sm:px-3">
          <Button size="icon" variant={deviceState.micEnabled ? "secondary" : "destructive"} onClick={() => {
            toggleMic(!deviceState.micEnabled);
            if (store.self) void emitAck("toggle-mic", { meetingId, participantId: store.self.id, enabled: !deviceState.micEnabled });
          }} aria-label="Microphone">
            {deviceState.micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <Button size="icon" variant={deviceState.cameraEnabled ? "secondary" : "destructive"} onClick={() => {
            toggleCamera(!deviceState.cameraEnabled);
            if (store.self) void emitAck("toggle-camera", { meetingId, participantId: store.self.id, enabled: !deviceState.cameraEnabled });
          }} aria-label="Camera">
            {deviceState.cameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </Button>
          <Button size="icon" variant={store.screenStream ? "destructive" : "secondary"} onClick={() => void shareScreen()} aria-label={store.screenStream ? "Stop sharing screen" : "Share screen"}>
            {store.screenStream ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
          </Button>
          <Button size="icon" variant="destructive" onClick={() => void leaveMeeting()} aria-label="Leave">
            <LogOut className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="secondary" onClick={() => {
            store.setParticipantsOpen(!store.participantsOpen);
            if (!store.participantsOpen) store.setChatOpen(false);
          }} aria-label="Participants" className="relative">
            <Users className="h-5 w-5" />
            {isHost && store.pendingRequests.length ? (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 text-xs text-white">{store.pendingRequests.length}</span>
            ) : null}
          </Button>
          <Button size="icon" variant="secondary" onClick={() => {
            store.setChatOpen(!store.chatOpen);
            if (!store.chatOpen) store.setParticipantsOpen(false);
          }} aria-label="Chat" className="relative">
            <MessageSquare className="h-5 w-5" />
            {store.unread ? <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-xs text-white">{store.unread}</span> : null}
          </Button>
        </div>
      </section>
      {store.participantsOpen ? (
        <div className="absolute inset-y-0 right-0 z-30 w-full max-w-xs shadow-2xl md:static md:z-auto md:w-80 md:max-w-none md:shrink-0">
          <ParticipantsPanel onClose={() => store.setParticipantsOpen(false)} />
        </div>
      ) : null}
      {store.chatOpen ? (
        <div className="absolute inset-y-0 right-0 z-30 w-full max-w-xs shadow-2xl md:static md:z-auto md:w-96 md:max-w-none md:shrink-0">
          <ChatPanel onClose={() => store.setChatOpen(false)} />
        </div>
      ) : null}
    </main>
  );
}

function playJoinRequestTone() {
  try {
    const audioContext = new AudioContext();
    const gain = audioContext.createGain();
    gain.gain.value = 0.04;
    gain.connect(audioContext.destination);

    [660, 880].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      oscillator.connect(gain);
      const start = audioContext.currentTime + index * 0.13;
      oscillator.start(start);
      oscillator.stop(start + 0.1);
    });

    setTimeout(() => void audioContext.close(), 500);
  } catch {
    // Sound is a nice-to-have; browsers can block it in some contexts.
  }
}
