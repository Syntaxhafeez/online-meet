import { Router } from "express";
import { createMeeting, getMeeting } from "../controllers/meeting.controller.js";

export const meetingRouter = Router();

meetingRouter.post("/", createMeeting);
meetingRouter.get("/:meetingId", getMeeting);
