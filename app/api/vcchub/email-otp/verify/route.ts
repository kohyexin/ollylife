import { errorResponse } from '@/lib/demo-api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const requestId = String(payload.requestId ?? '').trim();
    const email = String(payload.email ?? '').trim().toLowerCase();
    const code = String(payload.code ?? '').trim();
    if (!requestId.startsWith('otp_')) throw new Error('The verification request is invalid or expired. Request a new code.');
    if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
    if (code !== '123456') throw new Error('The verification code is incorrect. Please try again.');

    return Response.json({
      requestId,
      email,
      purpose: 'WALLET_SIGNUP',
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      api: 'VCCHUB demo · verify wallet signup email OTP',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
