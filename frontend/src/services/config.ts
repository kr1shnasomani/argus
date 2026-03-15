import { api } from "@/lib/api";

export const getThresholds = async (category?: string) => {
  const url = category ? `/config/thresholds/${category}` : "/config/thresholds";
  const { data } = await api.get(url);
  return data;
};

export const getSystems = async () => {
  const { data } = await api.get("/config/systems");
  return data;
};

export const simulate = async (params: any) => {
  const { data } = await api.post("/simulate", params);
  return data;
};
