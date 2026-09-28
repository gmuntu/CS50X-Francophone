export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  const hasGoogleOAuth = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID.trim().length > 5
  );
  const hasGithubOAuth = !!(
    process.env.AUTH_GITHUB_ID &&
    process.env.AUTH_GITHUB_SECRET &&
    process.env.AUTH_GITHUB_ID.trim().length > 5
  );

  return NextResponse.json({
    hasGoogleOAuth,
    hasGithubOAuth,
  });
}
