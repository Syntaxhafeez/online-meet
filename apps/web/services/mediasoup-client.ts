"use client";

import * as mediasoupClient from "mediasoup-client";
import type { Consumer, Device, Producer, Transport } from "mediasoup-client/types";
import { emitAck, getSocket } from "./socket";
import { useMeetingStore } from "@/store/meeting-store";

type TransportOptions = {
  id: string;
  iceParameters: unknown;
  iceCandidates: unknown[];
  dtlsParameters: unknown;
  sctpParameters?: unknown;
};

export class MeetMediaClient {
  private device?: Device;
  private sendTransport?: Transport;
  private recvTransport?: Transport;
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();

  async join(meetingId: string, participantId: string, localStream: MediaStream) {
    const routerRtpCapabilities = await emitAck<mediasoupClient.types.RtpCapabilities>("mediasoup:get-router-rtp-capabilities", { meetingId });
    this.device = new mediasoupClient.Device();
    await this.device.load({ routerRtpCapabilities });

    this.sendTransport = await this.createTransport(meetingId, participantId, "send");
    this.recvTransport = await this.createTransport(meetingId, participantId, "recv");

    for (const track of localStream.getTracks()) {
      await this.produceTrack(meetingId, participantId, track, { source: track.kind === "audio" ? "mic" : "camera" });
    }

    const existing = await emitAck<Array<{ producerId: string; participantId: string }>>("join-producers:list", { meetingId, participantId }).catch(() => []);
    await Promise.all(existing.map((producer) => this.consume(meetingId, participantId, producer.producerId, producer.participantId)));

    getSocket().on("mediasoup:new-producer", (producer: { producerId?: string; id?: string; participantId: string }) => {
      const producerId = producer.producerId ?? producer.id;
      if (producerId && producer.participantId !== participantId) void this.consume(meetingId, participantId, producerId, producer.participantId);
    });
  }

  async publishScreen(meetingId: string, participantId: string, stream: MediaStream) {
    for (const track of stream.getVideoTracks()) await this.produceTrack(meetingId, participantId, track, { source: "screen" });
  }

  close() {
    this.consumers.forEach((consumer) => consumer.close());
    this.producers.forEach((producer) => producer.close());
    this.sendTransport?.close();
    this.recvTransport?.close();
  }

  private async createTransport(meetingId: string, participantId: string, direction: "send" | "recv") {
    const params = await emitAck<TransportOptions>("mediasoup:create-transport", { meetingId, participantId, direction });
    if (!this.device) throw new Error("Device not loaded");
    const iceServers = getIceServers();
    const options = { ...(params as mediasoupClient.types.TransportOptions), iceServers };
    const transport =
      direction === "send"
        ? this.device.createSendTransport(options)
        : this.device.createRecvTransport(options);

    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      emitAck("mediasoup:connect-transport", { meetingId, participantId, transportId: transport.id, dtlsParameters }).then(() => callback()).catch(errback);
    });

    if (direction === "send") {
      transport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
        emitAck<{ id: string }>("mediasoup:produce", { meetingId, participantId, transportId: transport.id, kind, rtpParameters, appData })
          .then(({ id }) => callback({ id }))
          .catch(errback);
      });
    }

    return transport;
  }

  private async produceTrack(meetingId: string, participantId: string, track: MediaStreamTrack, appData: Record<string, unknown>) {
    if (!this.sendTransport) throw new Error("Send transport not ready");
    const encodings =
      track.kind === "video"
        ? [
            { rid: "q", maxBitrate: 150_000, scaleResolutionDownBy: 4 },
            { rid: "h", maxBitrate: 500_000, scaleResolutionDownBy: 2 },
            { rid: "f", maxBitrate: 1_200_000, scaleResolutionDownBy: 1 }
          ]
        : undefined;
    const producer = await this.sendTransport.produce({ track, encodings, appData, codecOptions: { videoGoogleStartBitrate: 1000 } });
    this.producers.set(producer.id, producer);
    producer.on("trackended", () => this.producers.delete(producer.id));
    producer.on("transportclose", () => this.producers.delete(producer.id));
  }

  private async consume(meetingId: string, participantId: string, producerId: string, remoteParticipantId: string) {
    if (!this.device || !this.recvTransport) return;
    const params = await emitAck<{
      id: string;
      kind: "audio" | "video";
      rtpParameters: mediasoupClient.types.RtpParameters;
      appData?: Record<string, unknown>;
    }>("mediasoup:consume", {
      meetingId,
      participantId,
      producerId,
      transportId: this.recvTransport.id,
      rtpCapabilities: this.device.rtpCapabilities
    });
    const consumer = await this.recvTransport.consume({ id: params.id, producerId, kind: params.kind, rtpParameters: params.rtpParameters });
    this.consumers.set(consumer.id, consumer);
    const stream = new MediaStream([consumer.track]);
    useMeetingStore.getState().addRemote({ id: consumer.id, participantId: remoteParticipantId, kind: params.kind, stream, appData: params.appData });
    await emitAck("mediasoup:resume-consumer", { meetingId, participantId, consumerId: consumer.id });
    consumer.resume();
  }
}

export const meetMediaClient = new MeetMediaClient();

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  if (process.env.NEXT_PUBLIC_STUN_URL) servers.push({ urls: process.env.NEXT_PUBLIC_STUN_URL });
  if (process.env.NEXT_PUBLIC_TURN_URL) {
    servers.push({
      urls: process.env.NEXT_PUBLIC_TURN_URL,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_PASSWORD
    });
  }
  return servers;
}
