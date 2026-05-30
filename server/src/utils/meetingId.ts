import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 10);

export function createMeetingId() {
  const raw = nanoid();
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 10)}`;
}
