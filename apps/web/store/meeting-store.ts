import { create } from "zustand";
import type { ChatMessage, Meeting, Participant, RemoteTrack } from "@/features/meeting/types";

type MeetingStore = {
  meeting?: Meeting;
  self?: Participant;
  localStream?: MediaStream;
  screenStream?: MediaStream;
  remotes: RemoteTrack[];
  pinnedParticipantId?: string;
  chatOpen: boolean;
  participantsOpen: boolean;
  unread: number;
  pendingRequests: Participant[];
  setMeeting: (meeting?: Meeting) => void;
  setSelf: (participant?: Participant) => void;
  setLocalStream: (stream?: MediaStream) => void;
  setScreenStream: (stream?: MediaStream) => void;
  addRemote: (track: RemoteTrack) => void;
  removeParticipantMedia: (participantId: string) => void;
  removeParticipantMediaSource: (participantId: string, source: string) => void;
  removeParticipant: (participantId: string) => void;
  setPinnedParticipantId: (id?: string) => void;
  addMessage: (message: ChatMessage) => void;
  setChatOpen: (open: boolean) => void;
  setParticipantsOpen: (open: boolean) => void;
  addRequest: (participant: Participant) => void;
  removeRequest: (participantId: string) => void;
  clearRequests: () => void;
  resetCall: () => void;
};

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  remotes: [],
  chatOpen: false,
  participantsOpen: false,
  unread: 0,
  pendingRequests: [],
  setMeeting: (meeting) => set({ meeting }),
  setSelf: (self) => set({ self }),
  setLocalStream: (localStream) => set({ localStream }),
  setScreenStream: (screenStream) => set({ screenStream }),
  addRemote: (track) =>
    set((state) => ({
      remotes: [...state.remotes.filter((remote) => remote.id !== track.id), track]
    })),
  removeParticipantMedia: (participantId) =>
    set((state) => {
      state.remotes.filter((remote) => remote.participantId === participantId).forEach((remote) => remote.stream.getTracks().forEach((track) => track.stop()));
      return { remotes: state.remotes.filter((remote) => remote.participantId !== participantId) };
    }),
  removeParticipantMediaSource: (participantId, source) =>
    set((state) => {
      const removed = state.remotes.filter((remote) => remote.participantId === participantId && remote.appData?.source === source);
      removed.forEach((remote) => remote.stream.getTracks().forEach((track) => track.stop()));
      return { remotes: state.remotes.filter((remote) => !(remote.participantId === participantId && remote.appData?.source === source)) };
    }),
  removeParticipant: (participantId) =>
    set((state) => {
      state.remotes.filter((remote) => remote.participantId === participantId).forEach((remote) => remote.stream.getTracks().forEach((track) => track.stop()));
      return {
        meeting: state.meeting ? { ...state.meeting, participants: state.meeting.participants.filter((participant) => participant.id !== participantId) } : state.meeting,
        remotes: state.remotes.filter((remote) => remote.participantId !== participantId),
        pinnedParticipantId: state.pinnedParticipantId === participantId ? undefined : state.pinnedParticipantId
      };
    }),
  setPinnedParticipantId: (pinnedParticipantId) => set({ pinnedParticipantId }),
  addMessage: (message) =>
    set((state) => ({
      meeting: state.meeting ? { ...state.meeting, messages: [...state.meeting.messages, message] } : state.meeting,
      unread: state.chatOpen ? state.unread : state.unread + 1
    })),
  setChatOpen: (chatOpen) => set({ chatOpen, unread: chatOpen ? 0 : get().unread }),
  setParticipantsOpen: (participantsOpen) => set({ participantsOpen }),
  addRequest: (participant) => set((state) => ({ pendingRequests: [...state.pendingRequests.filter((p) => p.id !== participant.id), participant] })),
  removeRequest: (participantId) => set((state) => ({ pendingRequests: state.pendingRequests.filter((p) => p.id !== participantId) })),
  clearRequests: () => set({ pendingRequests: [] }),
  resetCall: () =>
    set((state) => {
      state.localStream?.getTracks().forEach((track) => track.stop());
      state.screenStream?.getTracks().forEach((track) => track.stop());
      state.remotes.forEach((remote) => remote.stream.getTracks().forEach((track) => track.stop()));
      return {
        meeting: undefined,
        self: undefined,
        localStream: undefined,
        screenStream: undefined,
        remotes: [],
        pinnedParticipantId: undefined,
        chatOpen: false,
        participantsOpen: false,
        unread: 0,
        pendingRequests: []
      };
    })
}));
