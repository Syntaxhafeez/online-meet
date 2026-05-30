import { describe, expect, it } from "vitest";
import { ClientEvents, ServerEvents } from "../../src/socket/events.js";

describe("socket event contract", () => {
  it("contains required meeting events", () => {
    expect(ClientEvents.RequestJoin).toBe("request-join");
    expect(ClientEvents.AdmitUser).toBe("admit-user");
    expect(ClientEvents.SendMessage).toBe("send-message");
    expect(ServerEvents.JoinRequested).toBe("join-requested");
    expect(ServerEvents.NewMessage).toBe("new-message");
  });
});
