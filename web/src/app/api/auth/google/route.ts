import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/google';

export async function GET() {
  const oauth2Client = getOAuth2Client();

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
  });

  return NextResponse.redirect(url);
}
