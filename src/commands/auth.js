import http from 'http';
import net from 'net';
import axios from 'axios';
import open from 'open';
import ora from 'ora';
import { generatePKCE } from '../lib/pkce.js';
import { saveCredentials, loadCredentials, clearCredentials } from '../lib/credentials.js';
import { createApiClient, BACKEND_URL } from '../lib/api.js';

function findFreePort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function startCallbackServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>Login successful! You can close this tab.</h2></body></html>');
      server.close();

      if (code && state) resolve({ code, state });
      else reject(new Error('Missing code or state in callback'));
    });

    server.listen(port);

    setTimeout(() => {
      server.close();
      reject(new Error('Login timed out. Please try again.'));
    }, 5 * 60 * 1000);
  });
}

export async function loginCommand() {
  const spinner = ora('Initiating GitHub OAuth...').start();
  try {
    const { codeVerifier, codeChallenge } = generatePKCE();
    const port = await findFreePort();
    const redirectUri = `http://localhost:${port}/callback`;

    const initRes = await axios.get(`${BACKEND_URL}/auth/github`, {
      params: { code_challenge: codeChallenge, redirect_uri: redirectUri },
    });

    const { url, state: expectedState } = initRes.data;
    spinner.stop();

    const callbackPromise = startCallbackServer(port);
    console.log('Opening browser for GitHub login...');
    await open(url);

    const { code, state: returnedState } = await callbackPromise;

    if (returnedState !== expectedState) {
      console.error('State mismatch — possible security issue. Aborting.');
      process.exit(1);
    }

    spinner.start('Completing login...');
    const tokenRes = await axios.post(`${BACKEND_URL}/auth/github/token`, {
      code,
      state: returnedState,
      code_verifier: codeVerifier,
    });

    const { access_token, refresh_token, user } = tokenRes.data;
    saveCredentials({ access_token, refresh_token, username: user.username });

    spinner.succeed(`Logged in as @${user.username}`);
  } catch (err) {
    spinner.fail('Login failed');
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}

export async function logoutCommand() {
  const creds = loadCredentials();
  const spinner = ora('Logging out...').start();
  try {
    if (creds?.refresh_token) {
      await axios.post(`${BACKEND_URL}/auth/logout`, { refresh_token: creds.refresh_token });
    }
    clearCredentials();
    spinner.succeed('Logged out successfully');
  } catch {
    clearCredentials();
    spinner.succeed('Logged out');
  }
}

export async function whoamiCommand() {
  const creds = loadCredentials();
  if (!creds?.access_token) {
    console.error('Not logged in. Run: insighta login');
    process.exit(1);
  }
  const spinner = ora('Fetching user info...').start();
  try {
    const api = createApiClient();
    const res = await api.get('/auth/me');
    const user = res.data.data;
    spinner.stop();
    console.log(`Username : @${user.username}`);
    console.log(`Email    : ${user.email || 'N/A'}`);
    console.log(`Role     : ${user.role}`);
  } catch (err) {
    spinner.fail('Failed to fetch user info');
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}
