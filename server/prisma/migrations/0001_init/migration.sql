CREATE TYPE "MeetingStatus" AS ENUM ('ACTIVE', 'ENDED');
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'PARTICIPANT');
CREATE TYPE "ParticipantStatus" AS ENUM ('WAITING', 'ADMITTED', 'REJECTED', 'LEFT');
CREATE TYPE "MessageType" AS ENUM ('USER', 'SYSTEM');

CREATE TABLE "Meeting" (
  "id" TEXT NOT NULL,
  "title" TEXT,
  "hostId" TEXT,
  "status" "MeetingStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Participant" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "socketId" TEXT,
  "role" "ParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
  "status" "ParticipantStatus" NOT NULL DEFAULT 'WAITING',
  "micEnabled" BOOLEAN NOT NULL DEFAULT true,
  "cameraEnabled" BOOLEAN NOT NULL DEFAULT true,
  "screenSharing" BOOLEAN NOT NULL DEFAULT false,
  "joinedAt" TIMESTAMP(3),
  "leftAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "participantId" TEXT,
  "senderName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingSession" (
  "id" TEXT NOT NULL,
  "meetingId" TEXT NOT NULL,
  "metadata" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "MeetingSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Participant_meetingId_status_idx" ON "Participant"("meetingId", "status");
CREATE INDEX "Participant_socketId_idx" ON "Participant"("socketId");
CREATE INDEX "ChatMessage_meetingId_createdAt_idx" ON "ChatMessage"("meetingId", "createdAt");

ALTER TABLE "Participant" ADD CONSTRAINT "Participant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MeetingSession" ADD CONSTRAINT "MeetingSession_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
