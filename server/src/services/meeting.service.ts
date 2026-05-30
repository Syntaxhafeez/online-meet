import { prisma } from "../config/prisma.js";
import { createMeetingId } from "../utils/meetingId.js";
import { sanitizeText } from "../utils/sanitize.js";

export class MeetingService {
  async create(displayName: string) {
    let id = createMeetingId();
    while (await prisma.meeting.findUnique({ where: { id } })) id = createMeetingId();

    const hostName = sanitizeText(displayName, 80) || "Host";
    const meeting = await prisma.meeting.create({
      data: {
        id,
        participants: {
          create: {
            displayName: hostName,
            role: "HOST",
            status: "ADMITTED",
            joinedAt: new Date()
          }
        },
        sessions: { create: { metadata: { createdBy: hostName } } }
      },
      include: { participants: true }
    });

    const host = meeting.participants[0];
    await prisma.meeting.update({ where: { id }, data: { hostId: host.id } });
    return { ...meeting, hostId: host.id, host };
  }

  async get(id: string) {
    return prisma.meeting.findUnique({
      where: { id },
      include: {
        participants: { where: { status: { in: ["ADMITTED", "WAITING"] } }, orderBy: { createdAt: "asc" } },
        messages: { orderBy: { createdAt: "asc" }, take: 100 }
      }
    });
  }
}

export const meetingService = new MeetingService();
