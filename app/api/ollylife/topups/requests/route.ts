import { randomUUID } from 'node:crypto';
import { errorResponse, requireExternalUser } from '@/lib/demo-api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    requireExternalUser(payload);

    const amount = Number(payload.amount ?? 0);
    const commissionBalance = Number(payload.commissionBalance ?? 0);
    const email = String(payload.email ?? '').trim();
    if (!email) throw new Error('The OlyLife member email is required.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Top-up amount must be greater than zero.');
    if (!Number.isFinite(commissionBalance) || amount > commissionBalance) {
      return Response.json({ error: 'Insufficient OlyLife commission balance.' }, { status: 409 });
    }

    return Response.json({
      request: {
        id: `OTR-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`,
        externalUserId: String(payload.externalUserId),
        memberId: String(payload.memberId ?? ''),
        email,
        amount: Math.round(amount * 100) / 100,
        status: 'PENDING_APPROVAL',
        requestedAt: new Date().toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' }),
      },
      balancesChanged: false,
    }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
