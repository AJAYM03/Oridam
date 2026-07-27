import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import Link from "next/link";
import { SyncButton } from "@/components/SyncButton";

export default async function Home() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("oridam_user_id")?.value;

  let accounts: any[] = [];
  if (userId) {
    accounts = await prisma.googleAccount.findMany({
      where: { userId },
    });
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white p-12 font-sans selection:bg-white selection:text-black">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-medium tracking-tight mb-2">Oridam.</h1>
            <p className="text-[#888888] text-lg">Use all your Google accounts as one.</p>
          </div>
          {accounts.length > 0 && (
            <div className="flex gap-4">
              <Link 
                href="/drive"
                className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13.6745C13.1441 7 12.6354 6.78929 12.2603 6.41421L10.7397 4.8934C10.3646 4.51832 9.85592 4.30761 9.32548 4.30761H5C3.89543 4.30761 3 5.20304 3 6.30761V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open File Explorer
              </Link>
              <Link 
                href="/photos" 
                className="bg-[#1A1A1A] border border-[#333333] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#222222] transition-colors"
              >
                Open Photos Timeline
              </Link>
            </div>
          )}
        </header>

        <section className="space-y-6">
          <h2 className="text-xl font-medium text-[#EAEAEA]">Connected Storage</h2>
          
          {accounts.length === 0 ? (
            <div className="p-8 border border-[#333333] rounded-xl text-center bg-[#111111]">
              <p className="text-[#888888] mb-6">No accounts connected yet. The magic starts here.</p>
              <Link 
                href="/api/auth/google" 
                className="bg-white text-black px-5 py-2.5 rounded-lg font-medium hover:bg-[#EAEAEA] transition-colors"
              >
                Connect First Google Account
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {accounts.map(account => {
                const totalGB = (Number(account.totalSpace) / (1024 ** 3)).toFixed(2);
                const usedGB = (Number(account.usedSpace) / (1024 ** 3)).toFixed(2);
                const percentage = (Number(account.usedSpace) / Number(account.totalSpace)) * 100;
                
                return (
                  <div key={account.id} className="p-5 border border-[#333333] rounded-xl flex justify-between items-center bg-[#111111]">
                    <div className="space-y-1">
                      <p className="font-medium text-[#EAEAEA]">{account.email}</p>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-1.5 bg-[#333333] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-[#888888]">
                          {usedGB} GB / {totalGB} GB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] border border-[#333333] rounded-full">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                      <span className="text-xs text-[#888888] font-medium uppercase tracking-wider">Active</span>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 flex gap-4">
                <Link 
                  href="/api/auth/google" 
                  className="inline-flex items-center gap-2 bg-[#1A1A1A] border border-[#333333] text-[#EAEAEA] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#222222] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Connect Another Account
                </Link>
                
                <SyncButton />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
