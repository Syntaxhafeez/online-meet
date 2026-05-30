const API_URL = process.env.NEXT_PUBLIC_SIGNALING_URL ?? "http://localhost:4000";

export async function createMeeting(displayName: string) {
  const response = await fetch(`${API_URL}/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName })
  });
  if (!response.ok) throw new Error("Unable to create meeting");
  return response.json() as Promise<{ meetingId: string; hostParticipantId: string }>;
}

export async function getMeeting(meetingId: string) {
  const response = await fetch(`${API_URL}/meetings/${meetingId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Meeting not found");
  return response.json();
}
