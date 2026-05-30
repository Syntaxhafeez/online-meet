import { prisma } from "../config/prisma.js";
import { sanitizeText } from "../utils/sanitize.js";

export class ChatService {
  async create(meetingId: string, senderName: string, body: string, participantId?: string, type: "USER" | "SYSTEM" = "USER") {
    return prisma.chatMessage.create({
      data: {
        meetingId,
        participantId,
        senderName: sanitizeText(senderName, 80) || "System",
        body: sanitizeText(body, 1000),
        type
      }
    });
  }
}

export const chatService = new ChatService();
