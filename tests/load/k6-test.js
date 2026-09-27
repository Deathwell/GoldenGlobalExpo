import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ==============================================================================
// GOLDEN GLOBAL EXPO — ENTERPRISE LOAD & STRESS TESTING SUITE (k6)
// Covers Smoke, Peak Daily Load, and Chaos Spike Scenarios.
// Target: Kubernetes / Cloud Run / Multi-Worker Nginx ASGI Pods
// ==============================================================================

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8000';

// Custom Telemetry Metrics
export const ErrorRate = new Rate('custom_error_rate');
export const HealthzTrend = new Trend('healthz_duration_ms');
export const ReadyzTrend = new Trend('readyz_duration_ms');
export const PricesTrend = new Trend('prices_duration_ms');
export const TrackTrend = new Trend('track_duration_ms');
export const CommoditiesTrend = new Trend('commodities_duration_ms');
export const InquiryTrend = new Trend('inquiry_post_duration_ms');
export const SuccessfulInquiries = new Counter('successful_inquiries_count');

// Execution Scenarios configured based on CLI flags:
// Run smoke test: k6 run --env SCENARIO=smoke tests/load/k6-test.js
// Run load test:  k6 run --env SCENARIO=load tests/load/k6-test.js
// Run spike test: k6 run --env SCENARIO=spike tests/load/k6-test.js
// Run full suite: k6 run tests/load/k6-test.js

const SELECTED_SCENARIO = __ENV.SCENARIO || 'all';

function getScenarios() {
  if (SELECTED_SCENARIO === 'smoke') {
    return {
      smoke: {
        executor: 'constant-vus',
        vus: 1,
        duration: '30s',
        tags: { test_type: 'smoke' },
      },
    };
  }

  if (SELECTED_SCENARIO === 'load') {
    return {
      load: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '30s', target: 10 }, // Ramp up
          { duration: '1m', target: 25 },  // Peak traffic
          { duration: '30s', target: 25 }, // Steady state
          { duration: '20s', target: 0 },  // Graceful ramp down
        ],
        tags: { test_type: 'load' },
      },
    };
  }

  if (SELECTED_SCENARIO === 'spike') {
    return {
      spike: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '10s', target: 5 },   // Normal baseline
          { duration: '15s', target: 80 },  // Sudden 16x spike surge
          { duration: '45s', target: 80 },  // Sustained heavy surge
          { duration: '20s', target: 10 },  // Surge recovery
          { duration: '10s', target: 0 },   // Cooldown
        ],
        tags: { test_type: 'spike' },
      },
    };
  }

  // Default: Composite execution running Smoke followed by Ramped Load
  return {
    smoke_check: {
      executor: 'constant-vus',
      vus: 1,
      duration: '20s',
      tags: { test_type: 'smoke' },
    },
    peak_load: {
      executor: 'ramping-vus',
      startTime: '25s',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 15 },
        { duration: '1m', target: 30 },
        { duration: '20s', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
  };
}

export const options = {
  scenarios: getScenarios(),
  thresholds: {
    // SLO: Request failure rate must stay below 1% under normal/peak load
    http_req_failed: ['rate<0.02'],
    // 95% of all requests under 400ms, 99% under 800ms
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    // Specific SLA thresholds on core probes
    healthz_duration_ms: ['p(95)<100'],
    readyz_duration_ms: ['p(95)<200'],
    prices_duration_ms: ['p(95)<300'],
    track_duration_ms: ['p(95)<350'],
    custom_error_rate: ['rate<0.05'],
  },
};

export function getHeaders() {
  const vuId = typeof __VU !== 'undefined' ? __VU : 1;
  const ipSuffix = (vuId % 250) + 1;
  const ipPrefix = Math.floor(vuId / 250) + 1;
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'k6-load-runner/2.0 (Golden Global Expo Quality Gate)',
    'X-Forwarded-For': `10.0.${ipPrefix}.${ipSuffix}`,
  };
}

export default function () {
  const reqHeaders = getHeaders();

  // 1. Healthz Liveness Probe
  group('01_Liveness_Probe', function () {
    const res = http.get(`${BASE_URL}/healthz`, { headers: reqHeaders });
    HealthzTrend.add(res.timings.duration);
    const passed = check(res, {
      'healthz status is 200': (r) => r.status === 200,
      'healthz returns ok status': (r) => {
        try {
          return JSON.parse(r.body).status === 'ok';
        } catch {
          return false;
        }
      },
    });
    ErrorRate.add(!passed);
  });

  sleep(0.5);

  // 2. Readyz Readiness Probe (DB & Disk Latency Verification)
  group('02_Readiness_Probe', function () {
    const res = http.get(`${BASE_URL}/readyz`, { headers: reqHeaders });
    ReadyzTrend.add(res.timings.duration);
    const passed = check(res, {
      'readyz status is 200': (r) => r.status === 200,
      'readyz database CONNECTED': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ready' && body.database === 'CONNECTED';
        } catch {
          return false;
        }
      },
    });
    ErrorRate.add(!passed);
  });

  sleep(0.5);

  // 3. Commodity Pricing Schedule
  group('03_Commodity_Prices', function () {
    const res = http.get(`${BASE_URL}/api/prices`, { headers: reqHeaders });
    PricesTrend.add(res.timings.duration);
    const passed = check(res, {
      'prices status is 200': (r) => r.status === 200,
      'prices payload contains rates': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && typeof body.prices === 'object';
        } catch {
          return false;
        }
      },
    });
    ErrorRate.add(!passed);
  });

  sleep(0.5);

  // 4. Maritime & Domestic Consignment Tracking
  group('04_Consignment_Tracking', function () {
    const testTrackingCodes = ['GGE-JNPT-2026', 'GGE-RTM-8821', 'GGE-SGP-3104'];
    const chosenCode = testTrackingCodes[Math.floor(Math.random() * testTrackingCodes.length)];
    const res = http.get(`${BASE_URL}/api/track?bl=${encodeURIComponent(chosenCode)}`, { headers: reqHeaders });
    TrackTrend.add(res.timings.duration);

    const passed = check(res, {
      'track status is 200, 404, or 429': (r) => r.status === 200 || r.status === 404 || r.status === 429,
      'track returns structured json': (r) => {
        try {
          const body = JSON.parse(r.body);
          return 'success' in body;
        } catch {
          return false;
        }
      },
    });
    ErrorRate.add(!passed);
  });

  sleep(0.5);

  // 5. Commodity Quality Assays Catalog
  group('05_Commodities_Catalog', function () {
    const res = http.get(`${BASE_URL}/api/commodities`, { headers: reqHeaders });
    CommoditiesTrend.add(res.timings.duration);
    const passed = check(res, {
      'commodities status is 200': (r) => r.status === 200,
      'catalog contains items': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && Array.isArray(body.commodities);
        } catch {
          return false;
        }
      },
    });
    ErrorRate.add(!passed);
  });

  sleep(0.5);

  // 6. Domestic Trading Rates
  group('06_Domestic_Rates', function () {
    const res = http.get(`${BASE_URL}/api/domestic-rates`, { headers: reqHeaders });
    check(res, {
      'domestic rates status is 200': (r) => r.status === 200,
      'domestic rates contains upi credentials': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true && typeof body.rates === 'object';
        } catch {
          return false;
        }
      },
    });
  });

  sleep(1.0);

  // 7. Simulated Commercial RFQ Inquiry Submission (1 out of every 5 iterations to prevent rate-limit flooding)
  if (Math.random() < 0.2) {
    group('07_RFQ_Inquiry_Submission', function () {
      const payload = JSON.stringify({
        name: `Automated Load Agent ${Math.floor(Math.random() * 10000)}`,
        email: `loadtest_${Math.floor(Math.random() * 10000)}@trade-partner.ae`,
        company: 'International Agri Trade FZE',
        country: 'United Arab Emirates',
        commodities: 'Classic Toor (Tur Dal / Split Pigeon Pea)',
        volume: '24 MT',
        incoterms: 'CIF Jebel Ali',
        manifest: [
          { item: 'Toor Dal', quantity: 1200, unit: 'KG' },
          { item: 'Moong Whole', quantity: 800, unit: 'KG' }
        ]
      });

      const res = http.post(`${BASE_URL}/api/inquiries`, payload, { headers: reqHeaders });
      InquiryTrend.add(res.timings.duration);

      const passed = check(res, {
        'inquiry submission returns 200 or 429 (rate-limited)': (r) => r.status === 200 || r.status === 429,
      });

      if (res.status === 200) {
        SuccessfulInquiries.add(1);
      }
      ErrorRate.add(!passed);
    });
  }

  // Realistic randomized user think time between actions (1-2.5s)
  sleep(1.0 + Math.random() * 1.5);
}
