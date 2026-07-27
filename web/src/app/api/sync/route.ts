import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google';

export async function POST() {
  try {
    const accounts = await prisma.googleAccount.findMany();
    
    let totalSynced = 0;

    for (const account of accounts) {
      if (!account.refreshToken) continue;

      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: account.refreshToken,
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      let pageToken: string | undefined = undefined;

      do {
        const res = await drive.files.list({
          q: "trashed = false",
          fields: 'nextPageToken, files(id, name, mimeType, size, parents, modifiedTime, thumbnailLink)',
          pageSize: 1000,
          pageToken: pageToken,
        });

        const files = res.data.files || [];
        totalSynced += files.length;
        
        if (files.length > 0) {
           const transaction = files.map(file => {
             return prisma.driveFile.upsert({
               where: { id: file.id as string },
               update: {
                 name: file.name || 'Untitled',
                 mimeType: file.mimeType || '',
                 size: file.size ? BigInt(file.size) : 0n,
                 parentId: file.parents && file.parents.length > 0 ? file.parents[0] : null,
                 thumbnailLink: file.thumbnailLink || null,
                 updatedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
               },
               create: {
                 id: file.id as string,
                 accountId: account.id,
                 name: file.name || 'Untitled',
                 mimeType: file.mimeType || '',
                 size: file.size ? BigInt(file.size) : 0n,
                 parentId: file.parents && file.parents.length > 0 ? file.parents[0] : null,
                 thumbnailLink: file.thumbnailLink || null,
                 updatedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
               }
             });
           });
           await prisma.$transaction(transaction);
        }

        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      // Update lastSyncedAt
      await prisma.googleAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() }
      });
      
      console.log(`Synced files for ${account.email}`);
    }

    return NextResponse.json({ success: true, count: totalSynced });
  } catch (error: any) {
    console.error("Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
