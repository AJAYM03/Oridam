import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getVirtualDirectory } from "@/lib/vfs";
import Link from "next/link";
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

        {/* File List */}
        <div className="flex flex-col gap-1">
          {files.length === 0 && (
            <div className="text-center py-20 text-[#888888]">
              This folder is empty.
            </div>
          )}
          
          {files.map((file, idx) => {
            const isFolder = file.type === "folder";
            
            const href = isFolder 
              ? `/drive?path=${encodeURIComponent(currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`)}`
              : `/api/download?id=${file.id}&account=${file.accountId}`;

            return (
              <Link 
                key={idx}
                href={href}
                className="grid grid-cols-12 gap-4 px-4 py-3 rounded-lg hover:bg-[#1A1A1A] transition-colors items-center group cursor-pointer"
              >
                <div className="col-span-6 flex items-center gap-3">
                  {isFolder ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#888888] group-hover:text-white transition-colors">
                      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13.6745C13.1441 7 12.6354 6.78929 12.2603 6.41421L10.7397 4.8934C10.3646 4.51832 9.85592 4.30761 9.32548 4.30761H5C3.89543 4.30761 3 5.20304 3 6.30761V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#888888] group-hover:text-white transition-colors">
                      <path d="M13 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V10M13 3L20 10M13 3V8C13 9.10457 13.8954 10 15 10H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <span className="truncate font-medium group-hover:text-white">{file.name}</span>
                </div>
                <div className="col-span-3 text-sm text-[#888888]">
                  {formatDistanceToNow(file.updatedAt, { addSuffix: true })}
                </div>
                <div className="col-span-3 text-sm text-[#888888]">
                  {isFolder ? "—" : formatBytes(file.size)}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
