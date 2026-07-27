import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FileBrowser, ClientVirtualFile } from "@/components/FileBrowser";

export default async function PhotosPage(props: { searchParams: Promise<{ sort?: string }> }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("oridam_user_id")?.value;
  const searchParams = await props.searchParams;
  const sortOrder = searchParams?.sort === "asc" ? "asc" : "desc";

  if (!userId) {
    redirect("/");
  }

  // Query ALL images across all accounts, sorted by the EXIF Date Taken
  const images = await prisma.driveFile.findMany({
    where: {
      account: { userId },
      mimeType: { startsWith: "image/" },
      trashed: false,
    },
    orderBy: [
      { imageTime: { sort: sortOrder, nulls: 'last' } },
      { updatedAt: sortOrder },
    ],
  });

  const clientFiles: ClientVirtualFile[] = images.map(img => ({
    type: "file",
    name: img.name,
    mimeType: img.mimeType,
    sizeStr: img.size.toString(),
    updatedAt: img.imageTime || img.updatedAt,
    id: img.id,
    accountId: img.accountId,
    thumbnailLink: img.thumbnailLink || undefined,
  }));

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA] font-sans selection:bg-white selection:text-black">
      {/* Navbar */}
      <nav className="border-b border-[#333333] bg-[#111111] px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-medium tracking-tight hover:text-white transition-colors">
            Oridam.
          </Link>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/drive" className="text-[#888888] hover:text-white transition-colors">Drive</Link>
            <Link href="/photos" className="text-white border-b-2 border-white pb-1">Photos</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-white mb-2">Your Timeline</h1>
            <p className="text-[#888888]">
              {images.length} photos merged seamlessly across your accounts.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#888888] text-sm">Sort:</span>
            <div className="bg-[#1A1A1A] border border-[#333333] rounded-lg p-1 flex">
              <Link 
                href="/photos?sort=desc" 
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${sortOrder === 'desc' ? 'bg-[#333333] text-white' : 'text-[#888888] hover:text-white'}`}
              >
                Newest First
              </Link>
              <Link 
                href="/photos?sort=asc" 
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${sortOrder === 'asc' ? 'bg-[#333333] text-white' : 'text-[#888888] hover:text-white'}`}
              >
                Oldest First
              </Link>
            </div>
          </div>
        </header>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.length === 0 && (
            <div className="col-span-full text-center py-20 text-[#888888]">
              No photos found. Upload some or sync your metadata!
            </div>
          )}
          
          <FileBrowser files={clientFiles} currentPath="/photos" isGridView={true} />
        </div>
      </div>
    </main>
  );
}
