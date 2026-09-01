import { createCardholder, errorResponse, requireExternalUser } from '@/lib/demo-api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    requireExternalUser(payload);
    return Response.json(createCardholder(payload), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
