import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // 🪄 zieht URL aus .env
});

export default api;