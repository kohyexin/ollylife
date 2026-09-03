import { cancelCard, errorResponse, requireExternalUser } from '@/lib/demo-api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    requireExternalUser(payload);
    const result = cancelCard(payload);
    if ('conflict' in result && result.conflict) {
      return Response.json({ error: result.error }, { status: 409 });
    }
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
