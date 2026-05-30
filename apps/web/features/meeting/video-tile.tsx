"use client";

import { Maximize2, MicOff, Pin } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VideoTile({
  name,
  stream,
  muted,
  micEnabled = true,
  isScreen,
  onPin,
  className
}: {
  name: string;
  stream?: MediaStream;
  muted?: boolean;
  micEnabled?: boolean;
  isScreen?: boolean;
  onPin?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasVideo = Boolean(stream?.getVideoTracks().length);
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  const avatarTone = getAvatarTone(name);

  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    void ref.current.play().catch(() => {
      // The user has already interacted with the meeting controls, but keep this safe for stricter browsers.
    });
  }, [stream]);

  return (
    <div className={cn("group relative min-h-36 overflow-hidden rounded-lg bg-[#0f0c08] shadow-[0_12px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/10", className)}>
      {hasVideo ? (
        <video ref={ref} autoPlay playsInline muted={muted} className={cn("h-full w-full object-cover", isScreen && "object-contain")} />
      ) : (
        <div className={cn("relative flex h-full min-h-44 w-full items-center justify-center overflow-hidden", avatarTone.background)}>
          <div className={cn("absolute h-52 w-52 rounded-full blur-3xl", avatarTone.glowOne)} />
          <div className={cn("absolute -right-10 -top-10 h-56 w-56 rounded-full blur-3xl", avatarTone.glowTwo)} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.34),transparent_55%)]" />
          <div className={cn("relative flex h-24 w-24 items-center justify-center rounded-full border border-white/35 text-5xl font-semibold shadow-2xl backdrop-blur-md sm:h-28 sm:w-28 sm:text-6xl", avatarTone.avatar)}>
            {initial}
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/55 px-2 py-1 text-sm text-white">
        {!micEnabled ? <MicOff className="h-4 w-4 text-red-300" /> : null}
        <span>{name}</span>
      </div>
      <div className="absolute right-2 top-2 hidden gap-2 group-hover:flex">
        {onPin ? (
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={onPin} aria-label="Pin participant">
            <Pin className="h-4 w-4" />
          </Button>
        ) : null}
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => ref.current?.requestFullscreen()} aria-label="Fullscreen">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function getAvatarTone(name: string) {
  const tones = [
    {
      background: "bg-[#f7ecd0]",
      glowOne: "bg-[#e4b84f]/70",
      glowTwo: "bg-[#fff4c7]/90",
      avatar: "bg-[#c99318]/90 text-white"
    },
    {
      background: "bg-[#f9f1df]",
      glowOne: "bg-[#d9a441]/70",
      glowTwo: "bg-[#f7d775]/80",
      avatar: "bg-[#8d6210]/90 text-white"
    },
    {
      background: "bg-[#fff7e6]",
      glowOne: "bg-[#bf8c24]/60",
      glowTwo: "bg-[#ffe8a3]/90",
      avatar: "bg-[#f2c14e]/95 text-[#261900]"
    }
  ];
  const index = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tones.length;
  return tones[index];
}
