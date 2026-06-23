/**
 * Amdox ERP – k6 Load Test
 * Run: k6 run load-test.js
 * Target: 2,000 concurrent users, 99.9% uptime, <300ms P95
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency");

export const options = {
  stages: [
    { duration: "2m", target: 200 },   // Ramp up
    { duration: "5m", target: 2000 },  // Steady state — 2K users
    { duration: "2m", target: 2000 },  // Hold
    { duration: "1m", target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<300"],  // <300ms P95
    http_req_failed: ["rate<0.001"],   // <0.1% errors
    errors: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001/api/v1";
let authToken = "";

export function setup() {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: "admin@amdox.com",
    password: "password",
  }), { headers: { "Content-Type": "application/json" } });

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    return { token: body.data?.accessToken };
  }
  return { token: "" };
}

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: data?.token ? `Bearer ${data.token}` : "",
  };

  // Health check
  const healthRes = http.get(`${BASE_URL.replace("/api/v1", "")}/health/live`);
  check(healthRes, { "health: 200": (r) => r.status === 200 });
  apiLatency.add(healthRes.timings.duration);
  errorRate.add(healthRes.status !== 200);

  sleep(0.1);

  // KPI endpoint
  const kpiRes = http.get(`${BASE_URL}/bi/kpis`, { headers });
  check(kpiRes, { "kpis: 200 or 401": (r) => r.status === 200 || r.status === 401 });
  apiLatency.add(kpiRes.timings.duration);

  sleep(0.2);

  // Finance accounts
  const accRes = http.get(`${BASE_URL}/finance/accounts`, { headers });
  check(accRes, { "accounts: not 500": (r) => r.status !== 500 });
  apiLatency.add(accRes.timings.duration);
  errorRate.add(accRes.status >= 500);

  sleep(0.3);
}
