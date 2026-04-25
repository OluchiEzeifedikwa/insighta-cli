import axios from 'axios';
import { loadCredentials, saveCredentials } from './credentials.js';

const BACKEND_URL = 'https://mesh-data-persistence.vercel.app';

export function createApiClient() {
  const creds = loadCredentials();

  const client = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      Authorization: creds?.access_token ? `Bearer ${creds.access_token}` : '',
      'X-API-Version': '1',
    },
  });

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        const saved = loadCredentials();
        if (!saved?.refresh_token) {
          console.error('\nSession expired. Please run: insighta login');
          process.exit(1);
        }
        try {
          const refreshRes = await axios.post(`${BACKEND_URL}/auth/refresh`, {
            refresh_token: saved.refresh_token,
          });
          const { access_token, refresh_token } = refreshRes.data;
          saveCredentials({ ...saved, access_token, refresh_token });
          original.headers['Authorization'] = `Bearer ${access_token}`;
          return client(original);
        } catch {
          console.error('\nSession expired. Please run: insighta login');
          process.exit(1);
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export { BACKEND_URL };
