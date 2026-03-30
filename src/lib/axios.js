import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    // Handle successful responses
    return response.data;
  },
  (error) => {
    // Handle errors globally
    if (error.response?.status === 401) {
      // Handle unauthorized errors (e.g., redirect to login)
      // window.location.href = "/login";
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;
