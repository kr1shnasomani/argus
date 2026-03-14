import { api } from "@/lib/api";
import { EvidenceCard, AgentResolution } from "@/types";

// EscalatedQueue displays a lighter version of evidence cards, but for simplicity
// we map the GET /api/tickets/agent/escalated response which returns List[EvidenceCard]
export const getEscalatedTickets = async (): Promise<EvidenceCard[]> => {
  const { data } = await api.get<EvidenceCard[]>("/tickets/agent/escalated");
  return data;
};

export const getTicketEvidence = async (ticketId: string): Promise<EvidenceCard> => {
  const { data } = await api.get<EvidenceCard>(`/tickets/${ticketId}/evidence`);
  return data;
};

export const resolveTicket = async (resolution: AgentResolution): Promise<{ status: string; message: string }> => {
  const { data } = await api.post(`/tickets/${resolution.ticket_id}/resolve`, resolution);
  return data;
};
