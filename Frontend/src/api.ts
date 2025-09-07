import axios from 'axios';

//Template for fetching
const api = axios.create({
    baseURL: "http://localhost:8000"
});

export default api;