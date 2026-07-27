import { prisma } from "./prisma";

export type VirtualFile = {
  type: "folder" | "file";
  name: string;
  mimeType: string;
  size: bigint;
  updatedAt: Date;
  underlyingFolderIds?: string[]; 
  id?: string;
  accountId?: string;
  thumbnailLink?: string;
};

export async function getVirtualDirectory(userId: string, path: string): Promise<VirtualFile[]> {
  // 1. Get all accounts for this user
  const accounts = await prisma.googleAccount.findMany({ where: { userId } });
  const accountIds = accounts.map(a => a.id);
  
  if (accountIds.length === 0) return [];

  // 2. Fetch all files for these accounts to do in-memory VFS traversal
  // (Since it's a personal app, loading metadata for ~100k files in memory is extremely fast in Node.js)
  const allFiles = await prisma.driveFile.findMany({
    where: { accountId: { in: accountIds } }
  });

  // 3. Build a quick lookup map by ID and by Parent
  const fileById = new Map<string, typeof allFiles[0]>();
  const filesByParent = new Map<string, typeof allFiles[0][]>();
  const rootFiles: typeof allFiles[0][] = [];

  for (const file of allFiles) {
    fileById.set(file.id, file);
  }

  for (const file of allFiles) {
    // If the parentId doesn't exist in our DB, it means this file is at the root of its drive!
    if (!file.parentId || !fileById.has(file.parentId)) {
      rootFiles.push(file);
    } else {
      const children = filesByParent.get(file.parentId) || [];
      children.push(file);
      filesByParent.set(file.parentId, children);
    }
  }

  // 4. Resolve the Path to a set of underlying Folder IDs
  const segments = path.split('/').filter(Boolean);
  
  let currentFolderIds: string[] = []; // If empty at root, we use rootFiles
  
  if (segments.length === 0) {
    // We are at the root
  } else {
    // Traverse the path
    let currentChildren = rootFiles;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      // Find all folders in currentChildren that match this segment name
      const matchingFolders = currentChildren.filter(
        f => f.name === segment && f.mimeType === "application/vnd.google-apps.folder"
      );
      
      if (matchingFolders.length === 0) {
        throw new Error(`Path not found: ${path}`);
      }

      currentFolderIds = matchingFolders.map(f => f.id);
      
      // If we aren't at the end of the path, fetch the next level of children
      if (i < segments.length - 1) {
        currentChildren = currentFolderIds.flatMap(id => filesByParent.get(id) || []);
      }
    }
  }

  // 5. We now have the contents! 
  const contents = segments.length === 0 
    ? rootFiles 
    : currentFolderIds.flatMap(id => filesByParent.get(id) || []);

  // 6. Merge folders with the same name
  const virtualMap = new Map<string, VirtualFile>();

  for (const file of contents) {
    const isFolder = file.mimeType === "application/vnd.google-apps.folder";
    const key = isFolder ? `folder:${file.name}` : `file:${file.id}`; // Files don't merge, only folders do

    if (virtualMap.has(key)) {
      const existing = virtualMap.get(key)!;
      if (isFolder) {
        existing.underlyingFolderIds!.push(file.id);
        existing.size += file.size; // Accumulate size (usually 0 for GDrive folders anyway)
        if (file.updatedAt > existing.updatedAt) existing.updatedAt = file.updatedAt;
      }
    } else {
      virtualMap.set(key, {
        type: isFolder ? "folder" : "file",
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        updatedAt: file.updatedAt,
        underlyingFolderIds: isFolder ? [file.id] : undefined,
        id: isFolder ? undefined : file.id,
        accountId: file.accountId,
        thumbnailLink: file.thumbnailLink || undefined,
      });
    }
  }

  // 7. Sort: Folders first, then alphabetically
  const results = Array.from(virtualMap.values());
  results.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return results;
}
