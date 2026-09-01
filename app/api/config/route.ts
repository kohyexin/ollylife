import { sumsubSettings } from '@/lib/sumsub';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { appToken, secretKey, levelName } = sumsubSettings();
  return Response.json({
    configured: Boolean(appToken && secretKey && levelName),
    levelName: levelName || null,
    mode: 'sandbox',
    hosting: 'nextjs-vercel',
  });
}
