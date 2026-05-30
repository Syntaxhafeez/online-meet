import { MeetingGate } from "@/features/meeting/meeting-gate";

export default async function MeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  return <MeetingGate meetingId={meetingId} />;
}
