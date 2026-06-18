import axios from "axios";

export let apiUrl = 'http://localhost:5001/api'

const api = axios.create({
  baseURL: apiUrl,
});

export default api;