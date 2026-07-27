import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getVirtualDirectory } from "@/lib/vfs";
import Link from "next/link";
import { FileBrowser } from "@/components/FileBrowser";
import { formatDistanceToNow } from "date-fns";

export default async function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string }>;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("oridam_user_id")?.value;

  if (!userId) {
    redirect("/");
  }

  const { path } = await searchParams;
  const currentPath = path || "/";
  
  // Get the virtual files!
  const files = await getVirtualDirectory(userId, currentPath);
  
  const pathSegments = currentPath.split('/').filter(Boolean);

  function formatBytes(bytes: bigint) {
    if (bytes === 0n) return "0 B";
    const k = 1024n;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let b = bytes;
    while (b >= k && i < sizes.length - 1) {
      b /= k;
      i++;
    }
    return `${b.toString()} ${sizes[i]}`;
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA] font-sans selection:bg-white selection:text-black">
      {/* Navbar */}
      <nav className="border-b border-[#333333] bg-[#111111] px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-medium tracking-tight hover:text-white transition-colors">
          Oridam.
        </Link>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Search all accounts..." 
            className="bg-[#1A1A1A] border border-[#333333] rounded-md px-4 py-1.5 text-sm w-64 focus:outline-none focus:border-white transition-colors text-white placeholder-[#888888]"
          />
        </div>
      </nav>

      {/* Explorer */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-[#888888] mb-8 font-medium">
          <Link href="/drive" className="hover:text-white transition-colors">My Drive</Link>
          {pathSegments.map((segment, idx) => {
            const upToHere = "/" + pathSegments.slice(0, idx + 1).join("/");
            return (
              <div key={upToHere} className="flex items-center gap-2">
                <span>/</span>
                <Link href={`/drive?path=${encodeURIComponent(upToHere)}`} className="hover:text-white transition-colors">
                  {segment}
                </Link>
              </div>
            );
          })}
        </div>

        {/* File List Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-[#333333] text-xs font-medium text-[#888888] uppercase tracking-wider mb-2">
          <div className="col-span-6">Name</div>
          <div className="col-span-3">Last Modified</div>
          <div className="col-span-3">Size</div>
        </div>

        <FileBrowser 
          currentPath={currentPath} 
          files={files.map(f => ({
            ...f,
            sizeStr: f.size.toString(),
            thumbnailLink: f.thumbnailLink,
          }))}
        />
      </div>
    </main>
  );
}
