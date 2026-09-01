import { createCard, errorResponse, requireExternalUser } from '@/lib/demo-api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    requireExternalUser(payload);
    const result = createCard(payload);
    if ('conflict' in result) return Response.json({ error: result.error }, { status: 409 });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
