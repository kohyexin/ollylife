import { safeSumsubError, sumsubRequest, sumsubSettings } from '@/lib/sumsub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TokenResponse = { token?: string; userId?: string } & Record<string, unknown>;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const email = String(payload.email ?? '').trim();
    const phone = String(payload.phone ?? '').trim();
    const externalUserId = String(payload.externalUserId ?? '').trim();
    const { levelName } = sumsubSettings();

    if (!levelName) {
      return Response.json({ error: 'SUMSUB_LEVEL_NAME is not configured in Vercel.' }, { status: 503 });
    }
    if (!email || !email.includes('@')) throw new Error('A valid applicant email is required.');
    if (!externalUserId || externalUserId.length > 128) throw new Error('A valid externalUserId is required.');

    const result = await sumsubRequest<TokenResponse>('POST', '/resources/accessTokens/sdk', {
      ttlInSecs: 600,
      userId: externalUserId,
      levelName,
      applicantIdentifiers: { email, phone },
    });

    if (result.status >= 400) {
      return Response.json(safeSumsubError(result.data, 'Sumsub rejected the token request.'), {
        status: result.status,
      });
    }
    return Response.json({
      token: result.data.token,
      userId: result.data.userId ?? externalUserId,
      levelName,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to create a Sumsub token.' },
      { status: 400 },
    );
  }
}
