import { describe, expect, it } from "vitest";
import { createMeetingId } from "../../src/utils/meetingId.js";

describe("createMeetingId", () => {
  it("creates Google Meet style ids", () => {
    expect(createMeetingId()).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
  });
});
