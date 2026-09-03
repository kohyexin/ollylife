import { errorResponse } from '@/lib/demo-api';

export const dynamic = 'force-dynamic';

const demoMembers = new Map([
  ['olivia.chen@ollylife.com', {
    id: 'OL-208418',
    fullName: 'Olivia Chen',
    email: 'olivia.chen@ollylife.com',
    phoneCode: '+65',
    phone: '8123 4567',
    membershipTier: 'Gold',
  }],
  ['robinkoh.work@gmail.com', {
    id: 'OL-208419',
    fullName: 'Robin Koh Ye Xin',
    email: 'robinkoh.work@gmail.com',
    phoneCode: '+65',
    phone: '8123 4567',
    membershipTier: 'Member',
  }],
]);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const email = String(payload.email ?? '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const member = demoMembers.get(email);
    if (!member) {
      return Response.json({
        exists: false,
        code: 'OLLYLIFE_MEMBER_NOT_FOUND',
        error: 'No active OlyLife member matches this email address.',
      }, { status: 404 });
    }

    return Response.json({
      exists: true,
      member,
      checkedBy: 'OlyLife demo member API',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
