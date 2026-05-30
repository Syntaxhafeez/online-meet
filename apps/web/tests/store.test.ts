import { describe, expect, it } from "vitest";
import { useMeetingStore } from "../store/meeting-store";

describe("meeting store", () => {
  it("tracks unread messages when chat is closed", () => {
    useMeetingStore.setState({ meeting: { id: "abc-defg-hij", participants: [], messages: [] }, chatOpen: false, unread: 0 });
    useMeetingStore.getState().addMessage({
      id: "1",
      meetingId: "abc-defg-hij",
      senderName: "Ada",
      body: "hello",
      type: "USER",
      createdAt: new Date().toISOString()
    });
    expect(useMeetingStore.getState().unread).toBe(1);
  });
});
