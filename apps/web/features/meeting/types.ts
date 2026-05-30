export type Participant = {
  id: string;
  meetingId: string;
  displayName: string;
  role: "HOST" | "PARTICIPANT";
  status: "WAITING" | "ADMITTED" | "REJECTED" | "LEFT";
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  socketId?: string | null;
};

export type ChatMessage = {
  id: string;
  meetingId: string;
  participantId?: string | null;
  senderName: string;
  body: string;
  type: "USER" | "SYSTEM";
  createdAt: string;
};

export type Meeting = {
  id: string;
  hostId?: string | null;
  participants: Participant[];
  messages: ChatMessage[];
};

export type RemoteTrack = {
  id: string;
  participantId: string;
  kind: "audio" | "video";
  stream: MediaStream;
  appData?: Record<string, unknown>;
};
