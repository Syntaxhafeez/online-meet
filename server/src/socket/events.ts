export const ClientEvents = {
  JoinMeeting: "join-meeting",
  RequestJoin: "request-join",
  AdmitUser: "admit-user",
  RejectUser: "reject-user",
  SendMessage: "send-message",
  ToggleMic: "toggle-mic",
  ToggleCamera: "toggle-camera",
  StartScreenShare: "start-screen-share",
  StopScreenShare: "stop-screen-share",
  GetRouterRtpCapabilities: "mediasoup:get-router-rtp-capabilities",
  CreateTransport: "mediasoup:create-transport",
  ConnectTransport: "mediasoup:connect-transport",
  Produce: "mediasoup:produce",
  Consume: "mediasoup:consume",
  ResumeConsumer: "mediasoup:resume-consumer"
} as const;

export const ServerEvents = {
  UserJoined: "user-joined",
  UserLeft: "user-left",
  JoinRequested: "join-requested",
  JoinAdmitted: "join-admitted",
  JoinRejected: "join-rejected",
  NewMessage: "new-message",
  ParticipantUpdated: "participant-updated",
  MeetingState: "meeting-state",
  ConnectionQuality: "connection-quality",
  NewProducer: "mediasoup:new-producer",
  ProducerClosed: "mediasoup:producer-closed"
} as const;
