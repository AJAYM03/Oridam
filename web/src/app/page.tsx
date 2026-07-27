import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import Link from "next/link";

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
        <header>
          <h1 className="text-4xl font-medium tracking-tight mb-2">Oridam.</h1>
          <p className="text-[#888888] text-lg">Use all your Google accounts as one.</p>
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
              
              <div className="pt-4">
                <Link 
                  href="/api/auth/google" 
                  className="inline-flex items-center gap-2 bg-[#1A1A1A] border border-[#333333] text-[#EAEAEA] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#222222] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Connect Another Account
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
