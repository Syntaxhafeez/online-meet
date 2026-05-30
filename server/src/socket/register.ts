import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { chatService } from "../services/chat.service.js";
import { meetingService } from "../services/meeting.service.js";
import { participantService } from "../services/participant.service.js";
import { mediasoupManager } from "../mediasoup/manager.js";
import { ClientEvents, ServerEvents } from "./events.js";
import type { Participant } from "@prisma/client";

type Ack<T = unknown> = (payload: { ok: true; data: T } | { ok: false; error: string }) => void;

const meetingPayload = z.object({ meetingId: z.string(), participantId: z.string().optional() });
const requestJoinPayload = z.object({ meetingId: z.string(), displayName: z.string().min(1).max(80) });

function safeAck<T>(ack: Ack<T> | undefined, data: T) {
  ack?.({ ok: true, data });
}

function failAck(ack: Ack | undefined, error: unknown) {
  ack?.({ ok: false, error: error instanceof Error ? error.message : "Something went wrong" });
}

async function requireHost(meetingId: string, hostParticipantId: string) {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting || meeting.hostId !== hostParticipantId) throw new Error("Only the host can do this");
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    socket.on(ClientEvents.JoinMeeting, async (payload, ack: Ack | undefined) => {
      try {
        const data = meetingPayload.parse(payload);
        const meeting = await meetingService.get(data.meetingId);
        if (!meeting) throw new Error("Meeting not found");
        const participant = data.participantId
          ? await participantService.attachSocket(data.participantId, socket.id)
          : meeting.participants.find((p: Participant) => p.role === "HOST");
        if (!participant || participant.status !== "ADMITTED") throw new Error("Participant is not admitted");
        socket.data.meetingId = data.meetingId;
        socket.data.participantId = participant.id;
        socket.data.displayName = participant.displayName;
        socket.data.inMeeting = true;
        socket.join(data.meetingId);
        const fresh = await meetingService.get(data.meetingId);
        io.to(data.meetingId).emit(ServerEvents.MeetingState, fresh);
        io.to(data.meetingId).emit(ServerEvents.UserJoined, participant);
        safeAck(ack, { participant, meeting: fresh, producers: mediasoupManager.listProducers(data.meetingId, participant.id) });
      } catch (error) {
        failAck(ack, error);
      }
    });

    socket.on(ClientEvents.RequestJoin, async (payload, ack: Ack | undefined) => {
      try {
        const data = requestJoinPayload.parse(payload);
        const meeting = await meetingService.get(data.meetingId);
        if (!meeting) throw new Error("Meeting not found");
        const participant = await participantService.requestJoin(data.meetingId, data.displayName, socket.id);
        socket.data.meetingId = data.meetingId;
        socket.data.participantId = participant.id;
        socket.data.displayName = participant.displayName;
        const host = meeting.participants.find((p: Participant) => p.role === "HOST");
        if (host?.socketId) io.to(host.socketId).emit(ServerEvents.JoinRequested, participant);
        safeAck(ack, { participant });
      } catch (error) {
        failAck(ack, error);
      }
    });

    socket.on(ClientEvents.AdmitUser, async (payload, ack: Ack | undefined) => {
      try {
        const data = z.object({ meetingId: z.string(), hostParticipantId: z.string(), participantId: z.string() }).parse(payload);
        await requireHost(data.meetingId, data.hostParticipantId);
        const participant = await participantService.admit(data.participantId);
        const message = await chatService.create(data.meetingId, "System", `${participant.displayName} was admitted`, undefined, "SYSTEM");
        socket.to(participant.socketId ?? "").emit(ServerEvents.JoinAdmitted, participant);
        io.to(data.meetingId).emit(ServerEvents.NewMessage, message);
        io.to(data.meetingId).emit(ServerEvents.MeetingState, await meetingService.get(data.meetingId));
        safeAck(ack, participant);
      } catch (error) {
        failAck(ack, error);
      }
    });

    socket.on(ClientEvents.RejectUser, async (payload, ack: Ack | undefined) => {
      try {
        const data = z.object({ meetingId: z.string(), hostParticipantId: z.string(), participantId: z.string() }).parse(payload);
        await requireHost(data.meetingId, data.hostParticipantId);
        const participant = await participantService.reject(data.participantId);
        socket.to(participant.socketId ?? "").emit(ServerEvents.JoinRejected, participant);
        safeAck(ack, participant);
      } catch (error) {
        failAck(ack, error);
      }
    });

    socket.on(ClientEvents.SendMessage, async (payload, ack: Ack | undefined) => {
      try {
        const data = z.object({ meetingId: z.string(), participantId: z.string(), body: z.string().min(1).max(1000) }).parse(payload);
        const participant = await prisma.participant.findUnique({ where: { id: data.participantId } });
        if (!participant || participant.status !== "ADMITTED") throw new Error("Not admitted");
        const message = await chatService.create(data.meetingId, participant.displayName, data.body, data.participantId);
        io.to(data.meetingId).emit(ServerEvents.NewMessage, message);
        safeAck(ack, message);
      } catch (error) {
        failAck(ack, error);
      }
    });

    socket.on(ClientEvents.ToggleMic, (payload, ack) => updateParticipantMedia(io, payload, ack, { field: "micEnabled" }));
    socket.on(ClientEvents.ToggleCamera, (payload, ack) => updateParticipantMedia(io, payload, ack, { field: "cameraEnabled" }));
    socket.on(ClientEvents.StartScreenShare, (payload, ack) => updateParticipantMedia(io, payload, ack, { field: "screenSharing", value: true }));
    socket.on(ClientEvents.StopScreenShare, (payload, ack) => updateParticipantMedia(io, payload, ack, { field: "screenSharing", value: false }));

    registerMediasoupHandlers(io, socket);

    socket.on("join-producers:list", async (payload, ack: Ack | undefined) => {
      try {
        const data = z.object({ meetingId: z.string(), participantId: z.string().optional() }).parse(payload);
        safeAck(ack, mediasoupManager.listProducers(data.meetingId, data.participantId));
      } catch (error) {
        failAck(ack, error);
      }
    });

    socket.on("disconnect", async () => {
      const meetingId = socket.data.meetingId;
      const participantId = socket.data.participantId;
      if (meetingId && participantId && socket.data.inMeeting) {
        mediasoupManager.closePeer(meetingId, participantId);
        await participantService.leaveBySocket(socket.id);
        io.to(meetingId).emit(ServerEvents.UserLeft, { participantId });
        io.to(meetingId).emit(ServerEvents.MeetingState, await meetingService.get(meetingId));
      }
    });
  });
}

async function updateParticipantMedia(io: Server, payload: unknown, ack: Ack | undefined, options: { field: "micEnabled" | "cameraEnabled" | "screenSharing"; value?: boolean }) {
  try {
    const data = z.object({ meetingId: z.string(), participantId: z.string(), enabled: z.boolean().optional() }).parse(payload);
    const value = options.value ?? data.enabled;
    if (typeof value !== "boolean") throw new Error("Missing enabled value");
    const participant = await participantService.updateMedia(data.participantId, { [options.field]: value });
    io.to(data.meetingId).emit(ServerEvents.ParticipantUpdated, participant);
    safeAck(ack, participant);
  } catch (error) {
    failAck(ack, error);
  }
}

function registerMediasoupHandlers(io: Server, socket: Socket) {
  socket.on(ClientEvents.GetRouterRtpCapabilities, async (payload, ack: Ack | undefined) => {
    try {
      const data = z.object({ meetingId: z.string() }).parse(payload);
      safeAck(ack, await mediasoupManager.getRtpCapabilities(data.meetingId));
    } catch (error) {
      failAck(ack, error);
    }
  });

  socket.on(ClientEvents.CreateTransport, async (payload, ack: Ack | undefined) => {
    try {
      const data = z.object({ meetingId: z.string(), participantId: z.string() }).parse(payload);
      safeAck(ack, await mediasoupManager.createTransport(data.meetingId, data.participantId));
    } catch (error) {
      failAck(ack, error);
    }
  });

  socket.on(ClientEvents.ConnectTransport, async (payload, ack: Ack | undefined) => {
    try {
      const data = z.object({ meetingId: z.string(), participantId: z.string(), transportId: z.string(), dtlsParameters: z.any() }).parse(payload);
      await mediasoupManager.connectTransport(data.meetingId, data.participantId, data.transportId, data.dtlsParameters);
      safeAck(ack, true);
    } catch (error) {
      failAck(ack, error);
    }
  });

  socket.on(ClientEvents.Produce, async (payload, ack: Ack | undefined) => {
    try {
      const data = z.object({ meetingId: z.string(), participantId: z.string(), transportId: z.string(), kind: z.enum(["audio", "video"]), rtpParameters: z.any(), appData: z.record(z.unknown()).default({}) }).parse(payload);
      const producer = await mediasoupManager.produce(data.meetingId, data.participantId, data.transportId, data.kind, data.rtpParameters, data.appData);
      socket.to(data.meetingId).emit(ServerEvents.NewProducer, { producerId: producer.id, kind: producer.kind, appData: producer.appData, participantId: data.participantId });
      safeAck(ack, producer);
    } catch (error) {
      failAck(ack, error);
    }
  });

  socket.on(ClientEvents.Consume, async (payload, ack: Ack | undefined) => {
    try {
      const data = z.object({ meetingId: z.string(), participantId: z.string(), transportId: z.string(), producerId: z.string(), rtpCapabilities: z.any() }).parse(payload);
      safeAck(ack, await mediasoupManager.consume(data.meetingId, data.participantId, data.transportId, data.producerId, data.rtpCapabilities));
    } catch (error) {
      failAck(ack, error);
    }
  });

  socket.on(ClientEvents.ResumeConsumer, async (payload, ack: Ack | undefined) => {
    try {
      const data = z.object({ meetingId: z.string(), participantId: z.string(), consumerId: z.string() }).parse(payload);
      await mediasoupManager.resumeConsumer(data.meetingId, data.participantId, data.consumerId);
      safeAck(ack, true);
    } catch (error) {
      failAck(ack, error);
    }
  });
}
