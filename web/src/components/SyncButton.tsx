"use client";

import { useState } from "react";

export function SyncButton() {
  const [status, setStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");

  const handleSync = async () => {
    setStatus("syncing");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      setStatus("success");
    } catch (e) {
      setStatus("error");
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={status === "syncing"}
      className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.5 4.5L10.5 1.5M13.5 4.5L10.5 7.5M13.5 4.5H5.5C3.84315 4.5 2.5 5.84315 2.5 7.5V8.5M2.5 11.5L5.5 14.5M2.5 11.5L5.5 8.5M2.5 11.5H10.5C12.1569 11.5 13.5 10.1569 13.5 8.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {status === "idle" && "Sync Metadata"}
      {status === "syncing" && "Syncing..."}
      {status === "success" && "Sync Complete"}
      {status === "error" && "Sync Failed"}
    </button>
  );
}
