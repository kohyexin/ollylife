import fs from 'node:fs';
import path from 'node:path';
import Script from 'next/script';

export const dynamic = 'force-static';

function getDemoMarkup() {
  const html = fs.readFileSync(path.join(process.cwd(), 'demo', 'index.html'), 'utf8');
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];

  if (!body) {
    throw new Error('The Ollylife demo template could not be loaded.');
  }

  return body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: getDemoMarkup() }} />
      <Script
        src="https://static.sumsub.com/idensic/static/sns-websdk-builder.js"
        strategy="afterInteractive"
      />
      <Script src="/legacy-app.js" strategy="afterInteractive" />
    </>
  );
}
