"use client";

import { useCallback } from "react";
import { useDeviceStore } from "@/store/device-store";
import { useMeetingStore } from "@/store/meeting-store";

export function useMediaDevices() {
  const { audioInputId, videoInputId, micEnabled, cameraEnabled, setMicEnabled, setCameraEnabled, refreshDevices } = useDeviceStore();
  const { localStream, setLocalStream } = useMeetingStore();

  const startPreview = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: micEnabled
        ? {
            deviceId: audioInputId ? { exact: audioInputId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        : false,
      video: cameraEnabled
        ? {
            deviceId: videoInputId ? { exact: videoInputId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 }
          }
        : false
    });
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(stream);
    await refreshDevices();
    return stream;
  }, [audioInputId, cameraEnabled, localStream, micEnabled, refreshDevices, setLocalStream, videoInputId]);

  const toggleMic = useCallback((enabled: boolean) => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setMicEnabled(enabled);
  }, [localStream, setMicEnabled]);

  const toggleCamera = useCallback((enabled: boolean) => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setCameraEnabled(enabled);
  }, [localStream, setCameraEnabled]);

  return { startPreview, toggleMic, toggleCamera };
}
