import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Request: attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("amdox-auth");
      if (stored) {
        const { state } = JSON.parse(stored);
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      }
    } catch {
      // Ignore missing or malformed auth state
    }
  }
  return config;
});

// Response: refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = localStorage.getItem("amdox-auth");
        if (stored) {
          const { state } = JSON.parse(stored);
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/auth/refresh`,
            { refreshToken: state.refreshToken }
          );
          const newToken = data.data.accessToken;
          const parsed = JSON.parse(stored);
          parsed.state.accessToken = newToken;
          localStorage.setItem("amdox-auth", JSON.stringify(parsed));
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem("amdox-auth");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

// Typed helpers
export const apiGet = <T>(url: string, params?: object) =>
  api.get<{ success: boolean; data: T }>(url, { params }).then((r) => r.data.data);

export const apiPost = <T>(url: string, body?: object) =>
  api.post<{ success: boolean; data: T }>(url, body).then((r) => r.data.data);

export const apiPut = <T>(url: string, body?: object) =>
  api.put<{ success: boolean; data: T }>(url, body).then((r) => r.data.data);

export const apiPatch = <T>(url: string, body?: object) =>
  api.patch<{ success: boolean; data: T }>(url, body).then((r) => r.data.data);

export const apiDelete = <T>(url: string) =>
  api.delete<{ success: boolean; data: T }>(url).then((r) => r.data.data);
