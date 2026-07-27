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
          fields: 'nextPageToken, files(id, name, mimeType, size, parents, modifiedTime, thumbnailLink, imageMediaMetadata/time)',
          pageSize: 1000,
          pageToken: pageToken,
        });

        const files = res.data.files || [];
        totalSynced += files.length;
        
        if (files.length > 0) {
           const transaction = files.map(file => {
             const imageTimeStr = file.imageMediaMetadata?.time;
             let imageTime: Date | null = null;
             
             if (imageTimeStr) {
               // Try standard parsing
               imageTime = new Date(imageTimeStr);
               // If Invalid Date (common for EXIF "YYYY:MM:DD HH:MM:SS" format)
               if (isNaN(imageTime.getTime())) {
                 const fixedStr = imageTimeStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                 imageTime = new Date(fixedStr);
                 if (isNaN(imageTime.getTime())) {
                   imageTime = null; // Fallback to null if entirely unparseable
                 }
               }
             }
             
             return prisma.driveFile.upsert({
               where: { id: file.id as string },
               update: {
                 name: file.name || 'Untitled',
                 mimeType: file.mimeType || '',
                 size: file.size ? BigInt(file.size) : 0n,
                 parentId: file.parents && file.parents.length > 0 ? file.parents[0] : null,
                 thumbnailLink: file.thumbnailLink || null,
                 imageTime: imageTime,
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
                 imageTime: imageTime,
                 updatedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
               }
             });
           });
           await prisma.$transaction(transaction);
        }

        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      // 2. Fetch from Google Photos Library API
      let photosPageToken: string | undefined = undefined;
      do {
        const url = new URL("https://photoslibrary.googleapis.com/v1/mediaItems");
        url.searchParams.append("pageSize", "100");
        if (photosPageToken) url.searchParams.append("pageToken", photosPageToken);
        
        const photosRes = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${account.accessToken}` }
        });
        
        // If the user hasn't granted photoslibrary scope, skip this account gracefully
        if (!photosRes.ok) {
           console.warn(`Photos Library fetch failed for ${account.email}. Usually means missing scope. Status:`, photosRes.status);
           break; 
        }
        
        const data = await photosRes.json();
        const mediaItems = data.mediaItems || [];
        totalSynced += mediaItems.length;
        
        if (mediaItems.length > 0) {
           const transaction = mediaItems.map((item: any) => {
             const imageTimeStr = item.mediaMetadata?.creationTime;
             let imageTime: Date | null = null;
             
             if (imageTimeStr) {
               imageTime = new Date(imageTimeStr);
               if (isNaN(imageTime.getTime())) {
                 const fixedStr = imageTimeStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
                 imageTime = new Date(fixedStr);
                 if (isNaN(imageTime.getTime())) {
                   imageTime = null;
                 }
               }
             }
             
             return prisma.driveFile.upsert({
               where: { id: item.id },
               update: {
                 name: item.filename || 'Untitled Photo',
                 mimeType: item.mimeType || 'image/jpeg',
                 size: 0n, // Google Photos API doesn't return file size
                 parentId: null,
                 thumbnailLink: `${item.baseUrl}=w2048-h2048`, // Request high quality URL
                 imageTime: imageTime,
                 source: "PHOTOS",
                 updatedAt: imageTime || new Date(),
               },
               create: {
                 id: item.id,
                 accountId: account.id,
                 name: item.filename || 'Untitled Photo',
                 mimeType: item.mimeType || 'image/jpeg',
                 size: 0n,
                 parentId: null,
                 thumbnailLink: `${item.baseUrl}=w2048-h2048`,
                 imageTime: imageTime,
                 source: "PHOTOS",
                 updatedAt: imageTime || new Date(),
               }
             });
           });
           
           await prisma.$transaction(transaction);
        }
        
        photosPageToken = data.nextPageToken;
      } while (photosPageToken);

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
