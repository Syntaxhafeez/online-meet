import * as mediasoup from "mediasoup";
import os from "os";
import type { DtlsParameters, RtpCapabilities, RtpParameters } from "mediasoup/types";
import { routerOptions, webRtcTransportOptions, workerSettings } from "./config.js";
import type { PeerMediaState, RoomMediaState } from "./types.js";

class MediasoupManager {
  private workers: Awaited<ReturnType<typeof mediasoup.createWorker>>[] = [];
  private rooms = new Map<string, RoomMediaState>();
  private nextWorker = 0;

  async init() {
    const count = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));
    for (let index = 0; index < count; index += 1) {
      const worker = await mediasoup.createWorker(workerSettings);
      worker.on("died", () => {
        console.error("mediasoup worker died; exiting to let the process manager restart");
        process.exit(1);
      });
      this.workers.push(worker);
    }
  }

  async getOrCreateRoom(meetingId: string) {
    const existing = this.rooms.get(meetingId);
    if (existing) return existing;
    const worker = this.workers[this.nextWorker++ % this.workers.length];
    const router = await worker.createRouter(routerOptions);
    const room: RoomMediaState = { router, peers: new Map() };
    this.rooms.set(meetingId, room);
    return room;
  }

  async getRtpCapabilities(meetingId: string) {
    const room = await this.getOrCreateRoom(meetingId);
    return room.router.rtpCapabilities;
  }

  async createTransport(meetingId: string, participantId: string) {
    const room = await this.getOrCreateRoom(meetingId);
    const transport = await room.router.createWebRtcTransport(webRtcTransportOptions);
    await transport.setMaxIncomingBitrate(1_500_000);
    const peer = this.ensurePeer(room, participantId);
    peer.transports.set(transport.id, transport);
    transport.on("dtlsstatechange", (state: string) => {
      if (state === "closed") transport.close();
    });
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters
    };
  }

  async connectTransport(meetingId: string, participantId: string, transportId: string, dtlsParameters: DtlsParameters) {
    const transport = this.findPeer(meetingId, participantId)?.transports.get(transportId);
    if (!transport) throw new Error("Transport not found");
    await transport.connect({ dtlsParameters });
  }

  async produce(meetingId: string, participantId: string, transportId: string, kind: "audio" | "video", rtpParameters: RtpParameters, appData: Record<string, unknown>) {
    const peer = this.findPeer(meetingId, participantId);
    const transport = peer?.transports.get(transportId);
    if (!peer || !transport) throw new Error("Producer transport not found");
    const producer = await transport.produce({ kind, rtpParameters, appData: { ...appData, participantId } });
    peer.producers.set(producer.id, producer);
    producer.on("transportclose", () => peer.producers.delete(producer.id));
    return { id: producer.id, kind: producer.kind, appData: producer.appData };
  }

  async consume(meetingId: string, participantId: string, transportId: string, producerId: string, rtpCapabilities: RtpCapabilities) {
    const room = await this.getOrCreateRoom(meetingId);
    if (!room.router.canConsume({ producerId, rtpCapabilities })) throw new Error("Client cannot consume producer");
    const sourceProducer = [...room.peers.values()].flatMap((peer) => [...peer.producers.values()]).find((producer) => producer.id === producerId);
    const peer = this.findPeer(meetingId, participantId);
    const transport = peer?.transports.get(transportId);
    if (!peer || !transport) throw new Error("Consumer transport not found");
    const consumer = await transport.consume({ producerId, rtpCapabilities, paused: true });
    peer.consumers.set(consumer.id, consumer);
    consumer.on("transportclose", () => peer.consumers.delete(consumer.id));
    consumer.on("producerclose", () => {
      peer.consumers.delete(consumer.id);
      consumer.close();
    });
    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      appData: sourceProducer?.appData ?? consumer.appData
    };
  }

  async resumeConsumer(meetingId: string, participantId: string, consumerId: string) {
    const consumer = this.findPeer(meetingId, participantId)?.consumers.get(consumerId);
    if (!consumer) throw new Error("Consumer not found");
    await consumer.resume();
    if (consumer.kind === "video") await consumer.requestKeyFrame();
  }

  listProducers(meetingId: string, exceptParticipantId?: string) {
    const room = this.rooms.get(meetingId);
    if (!room) return [];
    return [...room.peers.entries()].flatMap(([participantId, peer]) =>
      participantId === exceptParticipantId
        ? []
        : [...peer.producers.values()].map((producer) => ({ producerId: producer.id, participantId, kind: producer.kind, appData: producer.appData }))
    );
  }

  closePeer(meetingId: string, participantId: string) {
    const room = this.rooms.get(meetingId);
    const peer = room?.peers.get(participantId);
    if (!room || !peer) return;
    peer.consumers.forEach((consumer) => consumer.close());
    peer.producers.forEach((producer) => producer.close());
    peer.transports.forEach((transport) => transport.close());
    room.peers.delete(participantId);
    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(meetingId);
    }
  }

  private ensurePeer(room: RoomMediaState, participantId: string): PeerMediaState {
    const existing = room.peers.get(participantId);
    if (existing) return existing;
    const peer: PeerMediaState = { transports: new Map(), producers: new Map(), consumers: new Map() };
    room.peers.set(participantId, peer);
    return peer;
  }

  private findPeer(meetingId: string, participantId: string) {
    return this.rooms.get(meetingId)?.peers.get(participantId);
  }
}

export const mediasoupManager = new MediasoupManager();
