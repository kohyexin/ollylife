import { safeSumsubError, sumsubRequest } from '@/lib/sumsub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ApplicantResponse = {
  id?: string;
  info?: {
    firstNameEn?: string;
    firstName?: string;
    lastNameEn?: string;
    lastName?: string;
    dob?: string;
    country?: string;
  };
} & Record<string, unknown>;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const applicantId = params.get('applicantId')?.trim() ?? '';
    const externalUserId = params.get('externalUserId')?.trim() ?? '';
    let apiPath: string;
    if (applicantId) {
      apiPath = `/resources/applicants/${encodeURIComponent(applicantId)}/one`;
    } else if (externalUserId) {
      apiPath = `/resources/applicants/-;externalUserId=${encodeURIComponent(externalUserId)}/one`;
    } else {
      throw new Error('applicantId or externalUserId is required.');
    }

    const result = await sumsubRequest<ApplicantResponse>('GET', apiPath);
    if (result.status >= 400) {
      return Response.json(safeSumsubError(result.data, 'Unable to retrieve Sumsub applicant data.'), {
        status: result.status,
      });
    }
    const info = result.data.info ?? {};
    return Response.json({
      applicantId: result.data.id ?? applicantId,
      firstName: info.firstNameEn || info.firstName || '',
      lastName: info.lastNameEn || info.lastName || '',
      dob: info.dob || '',
      country: info.country || '',
      source: 'Sumsub extracted applicant.info',
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to retrieve applicant data.' },
      { status: 400 },
    );
  }
}
