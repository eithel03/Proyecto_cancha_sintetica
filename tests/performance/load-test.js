import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    public_page_10_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      gracefulStop: '10s',
      startTime: '0s',
    },
    public_page_25_users: {
      executor: 'constant-vus',
      vus: 25,
      duration: '1m',
      gracefulStop: '10s',
      startTime: '1m15s',
    },
    public_page_50_users: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
      gracefulStop: '10s',
      startTime: '2m30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
}

export default function loadTest() {
  const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000'
  const path = __ENV.LOAD_TEST_PATH || '/'
  const response = http.get(`${baseUrl}${path}`)

  check(response, {
    'status is 2xx or expected redirect': (res) => (res.status >= 200 && res.status < 300) || res.status === 307,
  })

  sleep(1)
}
