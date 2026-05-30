import type { WorkerSettings, RouterOptions, WebRtcTransportOptions } from "mediasoup/types";
import { env } from "../config/env.js";

export const workerSettings: WorkerSettings = {
  rtcMinPort: env.MEDIASOUP_MIN_PORT,
  rtcMaxPort: env.MEDIASOUP_MAX_PORT,
  logLevel: "warn",
  logTags: ["ice", "dtls", "rtp", "srtp", "rtcp"]
};

export const routerOptions: RouterOptions = {
  mediaCodecs: [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
      parameters: { useinbandfec: 1 }
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: { "x-google-start-bitrate": 1000 }
    },
    {
      kind: "video",
      mimeType: "video/H264",
      clockRate: 90000,
      parameters: {
        "packetization-mode": 1,
        "profile-level-id": "42e01f",
        "level-asymmetry-allowed": 1
      }
    }
  ]
};

export const webRtcTransportOptions: WebRtcTransportOptions = {
  listenIps: [{ ip: env.MEDIASOUP_LISTEN_IP, announcedIp: env.MEDIASOUP_ANNOUNCED_IP }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: 1_000_000
};
