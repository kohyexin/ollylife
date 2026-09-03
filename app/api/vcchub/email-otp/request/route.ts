import { randomUUID } from 'node:crypto';

import { errorResponse } from '@/lib/demo-api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const email = String(payload.email ?? '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('A valid email address is required.');
    }

    return Response.json({
      requestId: `otp_${randomUUID().replaceAll('-', '').slice(0, 16)}`,
      email,
      purpose: 'WALLET_SIGNUP',
      delivery: 'EMAIL',
      status: 'SENT',
      expiresInSeconds: 300,
      demoCode: '123456',
      api: 'VCCHUB demo · send wallet signup email OTP',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
