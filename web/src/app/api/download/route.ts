import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const accountId = searchParams.get('account');

  if (!id || !accountId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  try {
    const account = await prisma.googleAccount.findUnique({ where: { id: accountId } });
    if (!account?.refreshToken) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: account.refreshToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const fileMeta = await drive.files.get({ fileId: id, fields: 'mimeType, name' });
    const mimeType = fileMeta.data.mimeType || '';

    // If it's a Google Workspace document, we can't download it raw. 
    // Redirect the user to view it on Google Drive.
    if (mimeType.startsWith('application/vnd.google-apps.')) {
      return NextResponse.redirect(`https://drive.google.com/file/d/${id}/view`);
    }

    // For standard files (PDF, images, zips), stream them directly through our VFS
    const res = await drive.files.get(
      { fileId: id, alt: 'media' },
      { responseType: 'stream' }
    );

    const stream = res.data as any;
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on('end', () => controller.close());
        stream.on('error', (err: Error) => controller.error(err));
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${fileMeta.data.name}"`, // inline allows viewing PDFs in browser
      }
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
