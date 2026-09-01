import { createHmac } from 'node:crypto';

const SUMSUB_ORIGIN = 'https://api.sumsub.com';

export function sumsubSettings() {
  return {
    appToken: process.env.SUMSUB_APP_TOKEN?.trim() ?? '',
    secretKey: process.env.SUMSUB_SECRET_KEY?.trim() ?? '',
    levelName: process.env.SUMSUB_LEVEL_NAME?.trim() ?? '',
  };
}

export async function sumsubRequest<T>(method: 'GET' | 'POST', apiPath: string, payload?: unknown) {
  const { appToken, secretKey } = sumsubSettings();
  if (!appToken || !secretKey) {
    throw new Error('Sumsub Sandbox credentials are not configured.');
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = payload === undefined ? '' : JSON.stringify(payload);
  const signature = createHmac('sha256', secretKey)
    .update(timestamp + method + apiPath + body)
    .digest('hex');

  const response = await fetch(SUMSUB_ORIGIN + apiPath, {
    method,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-App-Token': appToken,
      'X-App-Access-Ts': timestamp,
      'X-App-Access-Sig': signature,
    },
    body: body || undefined,
  });

  const text = await response.text();
  let data: T | Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = { error: 'Sumsub returned an unreadable response.' };
    }
  }

  return { status: response.status, data: data as T };
}

export function safeSumsubError(data: Record<string, unknown>, fallback: string) {
  return {
    error:
      (typeof data.description === 'string' && data.description) ||
      (typeof data.message === 'string' && data.message) ||
      fallback,
    code: data.code ?? null,
  };
}
