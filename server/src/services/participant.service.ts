import { prisma } from "../config/prisma.js";
import { sanitizeText } from "../utils/sanitize.js";

export class ParticipantService {
  async requestJoin(meetingId: string, displayName: string, socketId: string) {
    return prisma.participant.create({
      data: {
        meetingId,
        displayName: sanitizeText(displayName, 80) || "Guest",
        socketId,
        status: "WAITING"
      }
    });
  }

  async attachSocket(participantId: string, meetingId: string, socketId: string) {
    const existing = await prisma.participant.findFirst({
      where: { id: participantId, meetingId, status: { in: ["ADMITTED", "LEFT"] } }
    });
    if (!existing) throw new Error("This rejoin pass is no longer valid");
    return prisma.participant.update({
      where: { id: participantId },
      data: {
        socketId,
        status: "ADMITTED",
        joinedAt: new Date(),
        leftAt: null,
        screenSharing: false
      }
    });
  }

  async admit(participantId: string) {
    return prisma.participant.update({
      where: { id: participantId },
      data: { status: "ADMITTED", joinedAt: new Date() }
    });
  }

  async reject(participantId: string) {
    return prisma.participant.update({ where: { id: participantId }, data: { status: "REJECTED" } });
  }

  async leaveBySocket(socketId: string) {
    return prisma.participant.updateMany({
      where: { socketId, status: "ADMITTED" },
      data: { status: "LEFT", leftAt: new Date(), socketId: null }
    });
  }

  async leave(participantId: string, socketId: string) {
    return prisma.participant.updateMany({
      where: { id: participantId, socketId, status: "ADMITTED" },
      data: { status: "LEFT", leftAt: new Date(), socketId: null, screenSharing: false }
    });
  }

  async updateMedia(participantId: string, data: Partial<{ micEnabled: boolean; cameraEnabled: boolean; screenSharing: boolean }>) {
    return prisma.participant.update({ where: { id: participantId }, data });
  }
}

export const participantService = new ParticipantService();
