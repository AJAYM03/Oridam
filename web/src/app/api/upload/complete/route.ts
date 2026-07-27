import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('oridam_user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, mimeType, size, parentId, accountId } = body;

    if (!id || !accountId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newFile = await prisma.driveFile.create({
      data: {
        id,
        name: name || 'Untitled Upload',
        mimeType: mimeType || 'application/octet-stream',
        size: size ? BigInt(size) : 0n,
        parentId: parentId || null,
        accountId: accountId,
        source: 'DRIVE',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, file: { ...newFile, size: newFile.size.toString() } });

  } catch (error) {
    console.error('Upload complete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
