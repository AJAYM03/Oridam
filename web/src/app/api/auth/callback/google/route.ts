import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/google';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) throw new Error("No email returned from Google");

    // Get storage quota
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const about = await drive.about.get({ fields: 'storageQuota' });
    const quota = about.data.storageQuota;

    // For a single-user self-hosted app, we can just use a single User record.
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email,
          name: "Oridam User"
        }
      });
    }

    // Upsert the Google Account
    await prisma.googleAccount.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: email,
        }
      },
      update: {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || undefined,
        totalSpace: quota?.limit ? BigInt(quota.limit) : 0n,
        usedSpace: quota?.usage ? BigInt(quota.usage) : 0n,
      },
      create: {
        userId: user.id,
        email: email,
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || '',
        totalSpace: quota?.limit ? BigInt(quota.limit) : 0n,
        usedSpace: quota?.usage ? BigInt(quota.usage) : 0n,
      }
    });

    // Set simple cookie to maintain session
    const cookieStore = await cookies();
    cookieStore.set('oridam_user_id', user.id);

    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
