import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getOAuth2Client } from '@/lib/google';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('oridam_user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, mimeType, size, parentId } = body;

    if (!name || size === undefined) {
      return NextResponse.json({ error: 'Missing name or size' }, { status: 400 });
    }

    let targetAccountId = null;
    let targetParentId = parentId;

    if (parentId) {
      // Find which account this folder belongs to
      const parentFolder = await prisma.driveFile.findUnique({
        where: { id: parentId }
      });
      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 });
      }
      targetAccountId = parentFolder.accountId;
    } else {
      // Smart Router Algorithm: Largest Free Space
      const accounts = await prisma.googleAccount.findMany({
        where: { userId }
      });

      if (accounts.length === 0) {
        return NextResponse.json({ error: 'No linked Google accounts' }, { status: 400 });
      }

      let bestAccount = accounts[0];
      let maxFreeSpace = bestAccount.totalSpace - bestAccount.usedSpace;

      for (const acc of accounts) {
        const freeSpace = acc.totalSpace - acc.usedSpace;
        if (freeSpace > maxFreeSpace) {
          maxFreeSpace = freeSpace;
          bestAccount = acc;
        }
      }

      targetAccountId = bestAccount.id;
    }

    const account = await prisma.googleAccount.findUnique({
      where: { id: targetAccountId }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get fresh access token
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });
    const { token: freshAccessToken } = await oauth2Client.getAccessToken();

    // Initialize Resumable Upload Session with Google Drive
    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${freshAccessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
        'X-Upload-Content-Length': size.toString()
      },
      body: JSON.stringify({
        name: name,
        parents: targetParentId ? [targetParentId] : undefined
      })
    });

    if (!initRes.ok) {
      const errorText = await initRes.text();
      console.error('Google Drive Upload Init Error:', errorText);
      return NextResponse.json({ error: 'Failed to initialize Google Drive upload' }, { status: 500 });
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      return NextResponse.json({ error: 'Google did not return an upload URL' }, { status: 500 });
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return NextResponse.json({
      uploadUrl,
      tempId,
      accountId: account.id
    });

  } catch (error) {
    console.error('Upload init error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
