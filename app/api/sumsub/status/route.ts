import { sumsubRequest } from '@/lib/sumsub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const applicantId = new URL(request.url).searchParams.get('applicantId')?.trim() ?? '';
    if (!applicantId || !/^[a-zA-Z0-9-]+$/.test(applicantId)) {
      throw new Error('A valid applicantId is required.');
    }
    const result = await sumsubRequest<Record<string, unknown>>(
      'GET',
      `/resources/applicants/${encodeURIComponent(applicantId)}/status`,
    );
    return Response.json(result.data, { status: result.status });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to retrieve the status.' },
      { status: 400 },
    );
  }
}
