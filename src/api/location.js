import { api } from "./client";

export const locationApi = {
  // GET /location/regions
  regions: async () => (await api.get("/location/regions")).data,

  // GET /location/cities?regionId=1
  citiesByRegion: async (regionId) =>
    (await api.get("/location/cities", { params: { regionId } })).data,
};
