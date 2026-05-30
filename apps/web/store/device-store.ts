import { create } from "zustand";

type DeviceStore = {
  devices: MediaDeviceInfo[];
  audioInputId?: string;
  audioOutputId?: string;
  videoInputId?: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  refreshDevices: () => Promise<void>;
  setAudioInputId: (id: string) => void;
  setAudioOutputId: (id: string) => void;
  setVideoInputId: (id: string) => void;
  setMicEnabled: (enabled: boolean) => void;
  setCameraEnabled: (enabled: boolean) => void;
};

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  micEnabled: true,
  cameraEnabled: true,
  refreshDevices: async () => set({ devices: await navigator.mediaDevices.enumerateDevices() }),
  setAudioInputId: (audioInputId) => set({ audioInputId }),
  setAudioOutputId: (audioOutputId) => set({ audioOutputId }),
  setVideoInputId: (videoInputId) => set({ videoInputId }),
  setMicEnabled: (micEnabled) => set({ micEnabled }),
  setCameraEnabled: (cameraEnabled) => set({ cameraEnabled })
}));
