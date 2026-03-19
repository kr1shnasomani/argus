import { api } from "@/lib/api";
import { SimulationResponse } from "@/types";

export const getThresholds = async (category?: string) => {
  const url = category ? `/config/thresholds/${category}` : "/config/thresholds";
  const { data } = await api.get(url);
  return data;
};

export const getSystems = async () => {
  const { data } = await api.get("/config/systems");
  return data;
};

export interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  tier: string;
}

export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get("/config/users");
  return data;
};

export type SimulationRequestPayload = {
  description: string;
  user_tier: "standard" | "vip" | "contractor";
  severity: "P1" | "P2" | "P3" | "P4";
  system_id: string;
  active_incident_override: boolean;
  change_freeze_override: boolean;
};

export const simulate = async (params: SimulationRequestPayload): Promise<SimulationResponse> => {
  const { data } = await api.post<SimulationResponse>("/simulate", params);
  return data;
};
