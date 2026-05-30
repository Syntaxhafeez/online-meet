"use client";

import { Camera, CameraOff, Mic, MicOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useMediaDevices } from "@/hooks/use-media-devices";
import { getMeeting } from "@/lib/api";
import { emitAck, getSocket } from "@/services/socket";
import { useDeviceStore } from "@/store/device-store";
import { useMeetingStore } from "@/store/meeting-store";

export function Lobby({ meetingId }: { meetingId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { localStream } = useMeetingStore();
  const deviceState = useDeviceStore();
  const { startPreview, toggleMic, toggleCamera } = useMediaDevices();
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [requested, setRequested] = useState(false);
  const meetingQuery = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: () => getMeeting(meetingId),
    refetchInterval: 5000
  });

  useEffect(() => {
    setDisplayName(sessionStorage.getItem("displayName") ?? "");
    void startPreview().catch(() => setStatus("Camera or microphone permission was denied."));
  }, []);

  useEffect(() => {
    if (videoRef.current && localStream) videoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("join-admitted", (participant) => {
      sessionStorage.setItem(`participant:${meetingId}`, participant.id);
      window.location.reload();
    });
    socket.on("join-rejected", () => {
      setRequested(false);
      setStatus("The host rejected your request to join.");
    });
    return () => {
      socket.off("join-admitted");
      socket.off("join-rejected");
    };
  }, [meetingId]);

  const askToJoin = async () => {
    setStatus("Asking host to let you in...");
    setRequested(true);
    sessionStorage.setItem("displayName", displayName);
    try {
      await emitAck("request-join", { meetingId, displayName });
    } catch (error) {
      setRequested(false);
      setStatus(error instanceof Error ? error.message : "Could not request to join.");
    }
  };

  const audioInputs = deviceState.devices.filter((device) => device.kind === "audioinput");
  const audioOutputs = deviceState.devices.filter((device) => device.kind === "audiooutput");
  const videoInputs = deviceState.devices.filter((device) => device.kind === "videoinput");

  return (
    <main className="min-h-screen bg-[#fbf5e8] text-foreground">
      <header className="flex min-h-16 items-center justify-between border-b border-[#d7c797] bg-white px-4 py-3 shadow-sm sm:px-6">
        <div>
          <p className="text-sm text-muted-foreground">Joining meeting</p>
          <h1 className="text-lg font-semibold sm:text-xl">{meetingId}</h1>
        </div>
        <div className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
          {(meetingQuery.data?.participants ?? []).filter((participant: { status: string }) => participant.status === "ADMITTED").length} in call
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-8">
      <section className="flex min-h-[260px] items-center justify-center">
        <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-[#151008] shadow-sm">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>
      </section>
      <aside className="flex flex-col justify-center rounded-lg border border-[#d7c797] bg-white p-4 shadow-sm lg:p-5">
        <h2 className="text-2xl font-semibold">Ready to join?</h2>
        <div className="mt-4 rounded-md bg-muted p-3">
          <p className="text-sm font-medium">People already in this meeting</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(meetingQuery.data?.participants ?? [])
              .filter((participant: { status: string }) => participant.status === "ADMITTED")
              .map((participant: { id: string; displayName: string; role: string }) => (
                <span key={participant.id} className="rounded-full bg-background px-3 py-1 text-sm">
                  {participant.displayName}{participant.role === "HOST" ? " · Host" : ""}
                </span>
              ))}
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <Input placeholder="Your display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <Select value={deviceState.audioInputId ?? ""} onChange={(event) => deviceState.setAudioInputId(event.target.value)}>
            <option value="">Default microphone</option>
            {audioInputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microphone"}</option>)}
          </Select>
          <Select value={deviceState.videoInputId ?? ""} onChange={(event) => deviceState.setVideoInputId(event.target.value)}>
            <option value="">Default camera</option>
            {videoInputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Camera"}</option>)}
          </Select>
          <Select value={deviceState.audioOutputId ?? ""} onChange={(event) => deviceState.setAudioOutputId(event.target.value)}>
            <option value="">Default speaker</option>
            {audioOutputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || "Speaker"}</option>)}
          </Select>
        </div>
        <div className="mt-5 flex gap-3">
          <Button size="icon" variant={deviceState.micEnabled ? "secondary" : "destructive"} onClick={() => toggleMic(!deviceState.micEnabled)} aria-label="Toggle microphone">
            {deviceState.micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <Button size="icon" variant={deviceState.cameraEnabled ? "secondary" : "destructive"} onClick={() => toggleCamera(!deviceState.cameraEnabled)} aria-label="Toggle camera">
            {deviceState.cameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
          </Button>
          <Button className="min-w-0 flex-1" disabled={!displayName.trim() || requested} onClick={() => void askToJoin()}>
            {requested ? "Waiting for host" : "Ask to Join"}
          </Button>
        </div>
        {status ? <p className="mt-4 text-sm text-muted-foreground">{status}</p> : null}
      </aside>
      </div>
    </main>
  );
}
