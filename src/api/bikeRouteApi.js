import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const getBikeRoutes = () =>
  axios.get(`${BASE_URL}/bike_routes`);

export const getBikeRouteDetail = (routeId) =>
  axios.get(`${BASE_URL}/bike_routes/${routeId}`);

export const getBikeRoutePath = (routeId) =>
  axios.get(`${BASE_URL}/bike_routes/${routeId}/path`);
