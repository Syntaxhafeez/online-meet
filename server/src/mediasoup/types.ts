import type { Consumer, Producer, Router, WebRtcTransport, Worker } from "mediasoup/types";

export type MediaKind = "audio" | "video";

export type PeerMediaState = {
  transports: Map<string, WebRtcTransport>;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
};

export type RoomMediaState = {
  router: Router;
  peers: Map<string, PeerMediaState>;
};

export type MediasoupRuntime = {
  workers: Worker[];
  rooms: Map<string, RoomMediaState>;
};
