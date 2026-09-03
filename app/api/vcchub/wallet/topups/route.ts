import { errorResponse, requireExternalUser, topUpWallet } from '@/lib/demo-api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    requireExternalUser(payload);
    if (payload.approvalStatus !== 'APPROVED' || !String(payload.approvedBy ?? '').trim()) {
      return Response.json({ error: 'OlyLife Admin / Support approval is required before wallet funding.' }, { status: 403 });
    }
    const result = topUpWallet(payload);
    if ('conflict' in result) return Response.json({ error: result.error }, { status: 409 });

    return Response.json({
      ...result,
      apiTrace: [
        `OlyLife Admin / Support: request ${String(payload.topupRequestId ?? '')} approved`,
        'OlyLife: available commission balance rechecked',
        'OlyLife: commission balance debited',
        'OlyLife → VCCHUB: wallet top-up request accepted',
        'VCCHUB: wallet balance credited',
      ],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
