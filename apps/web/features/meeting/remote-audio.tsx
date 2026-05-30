"use client";

import { useEffect, useRef } from "react";

export function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    void ref.current.play().catch(() => {
      // Browsers may block autoplay until the user interacts with the page.
    });
  }, [stream]);

  return <audio ref={ref} autoPlay playsInline />;
}
