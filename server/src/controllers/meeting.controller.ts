import type { Request, Response } from "express";
import { z } from "zod";
import { meetingService } from "../services/meeting.service.js";

const createSchema = z.object({ displayName: z.string().min(1).max(80) });

export async function createMeeting(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const meeting = await meetingService.create(body.displayName);
  res.status(201).json({ meetingId: meeting.id, hostParticipantId: meeting.host.id });
}

export async function getMeeting(req: Request, res: Response) {
  const meeting = await meetingService.get(String(req.params.meetingId));
  if (!meeting) return res.status(404).json({ message: "Meeting not found" });
  res.json(meeting);
}
