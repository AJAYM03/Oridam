"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

export type ClientVirtualFile = {
  type: "folder" | "file";
  name: string;
  mimeType: string;
  sizeStr: string; // Serialized BigInt
  updatedAt: Date;
  underlyingFolderIds?: string[];
  id?: string;
  accountId?: string;
  thumbnailLink?: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let b = bytes;
  while (b >= k && i < sizes.length - 1) {
    b /= k;
    i++;
  }
  return `${b.toFixed(1)} ${sizes[i]}`;
}

export function FileBrowser({ files, currentPath, isGridView = false }: { files: ClientVirtualFile[], currentPath: string, isGridView?: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{name: string, progress: number}[]>([]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIndex(null);
      if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => {
          if (prev === null) return null;
          let next = prev + 1;
          while (next < files.length && files[next].type === "folder") next++;
          return next < files.length ? next : prev;
        });
      }
      if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => {
          if (prev === null) return null;
          let prevIdx = prev - 1;
          while (prevIdx >= 0 && files[prevIdx].type === "folder") prevIdx--;
          return prevIdx >= 0 ? prevIdx : prev;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, files]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      const newUploads = droppedFiles.map(f => ({ name: f.name, progress: 0 }));
      setUploadingFiles(prev => [...prev, ...newUploads]);

      for (const file of droppedFiles) {
        try {
          // 1. Initialize Upload (Smart Router calculates which account has space)
          const initRes = await fetch('/api/upload/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              parentId: null // Always upload to root for now
            })
          });

          if (!initRes.ok) throw new Error("Init failed");
          const { uploadUrl, tempId, accountId } = await initRes.json();

          // 2. Direct PUT to Google Drive
          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Length': file.size.toString()
            },
            body: file
          });

          if (!uploadRes.ok) throw new Error("Google upload failed");
          const googleFile = await uploadRes.json();

          // 3. Complete Upload (Save to our DB)
          await fetch('/api/upload/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: googleFile.id,
              name: googleFile.name,
              mimeType: googleFile.mimeType,
              size: file.size,
              parentId: null,
              accountId: accountId
            })
          });

          // Refresh the page to show new file
          window.location.reload();

        } catch (error) {
          console.error("Upload error for", file.name, error);
          alert(`Failed to upload ${file.name}`);
        }
      }
      setUploadingFiles([]);
    }
  };

  const selectedFile = selectedIndex !== null ? files[selectedIndex] : null;

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative min-h-[60vh] transition-colors ${isDragging ? 'bg-[#1A1A1A] border-2 border-dashed border-[#888888] rounded-xl' : ''}`}
    >
      {/* Uploading Overlay */}
      {uploadingFiles.length > 0 && (
        <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
          <div className="bg-[#111111] border border-[#333333] p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[#333333] border-t-white rounded-full animate-spin"></div>
            <p className="font-medium text-white">Uploading {uploadingFiles.length} file(s)...</p>
          </div>
        </div>
      )}
      
      {/* Lightbox Modal */}
      {selectedFile && selectedFile.type === "file" && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col backdrop-blur-md">
          <div className="flex justify-between items-center p-4 text-[#EAEAEA] border-b border-[#333333]">
            <div>
              <h3 className="font-medium text-white">{selectedFile.name}</h3>
              <p className="text-xs text-[#888888]">{formatBytes(Number(selectedFile.sizeStr))}</p>
            </div>
            <div className="flex items-center gap-6">
              <a 
                href={`/api/download?id=${selectedFile.id}&account=${selectedFile.accountId}&download=1`}
                className="text-sm font-medium hover:text-white transition-colors"
                download
              >
                Download Original
              </a>
              <button onClick={() => setSelectedIndex(null)} className="hover:text-white transition-colors p-2 bg-[#1A1A1A] rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative p-8 min-h-0 overflow-hidden">
            {selectedFile.mimeType.startsWith('image/') ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img 
                 src={selectedFile.thumbnailLink ? selectedFile.thumbnailLink.replace('=s220', '=s2048') : `/api/download?id=${selectedFile.id}&account=${selectedFile.accountId}`}
                 alt={selectedFile.name}
                 className="w-full h-full object-contain drop-shadow-2xl rounded-sm"
                 referrerPolicy="no-referrer"
                 onError={(e) => {
                   const fallbackSrc = `/api/download?id=${selectedFile.id}&account=${selectedFile.accountId}`;
                   if (e.currentTarget.src !== fallbackSrc && !e.currentTarget.src.includes('/api/download')) {
                     e.currentTarget.src = fallbackSrc;
                   }
                 }}
               />
            ) : selectedFile.mimeType.startsWith('video/') ? (
               <video 
                 src={`/api/download?id=${selectedFile.id}&account=${selectedFile.accountId}`}
                 controls
                 autoPlay
                 className="w-full h-full object-contain drop-shadow-2xl rounded-sm"
               />
            ) : (
               <div className="text-center">
                 <div className="w-24 h-24 mx-auto mb-6 text-[#444444]">
                   <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V10M13 3L20 10M13 3V8C13 9.10457 13.8954 10 15 10H20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                   </svg>
                 </div>
                 <p className="text-[#888888] mb-6">Preview not available for this file type.</p>
                 <a 
                    href={`/api/download?id=${selectedFile.id}&account=${selectedFile.accountId}`}
                    target="_blank"
                    className="bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                 >
                   Open Externally
                 </a>
               </div>
            )}
            
            <button 
              className="absolute left-8 p-3 bg-black/50 text-white rounded-full hover:bg-black/80 hover:scale-110 transition-all border border-[#333333]"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((prev) => {
                  if (prev === null) return null;
                  let prevIdx = prev - 1;
                  while (prevIdx >= 0 && files[prevIdx].type === "folder") prevIdx--;
                  return prevIdx >= 0 ? prevIdx : prev;
                });
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>

            <button 
              className="absolute right-8 p-3 bg-black/50 text-white rounded-full hover:bg-black/80 hover:scale-110 transition-all border border-[#333333]"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex((prev) => {
                  if (prev === null) return null;
                  let next = prev + 1;
                  while (next < files.length && files[next].type === "folder") next++;
                  return next < files.length ? next : prev;
                });
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Grid View (Photos) */}
      {isGridView ? (
        <>
          {files.map((file, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className="relative aspect-square cursor-pointer group bg-[#1A1A1A] rounded-lg overflow-hidden border border-[#333333] hover:border-[#666666] transition-all"
            >
              {file.thumbnailLink ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={file.thumbnailLink}
                  alt={file.name}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const fallbackSrc = `/api/download?id=${file.id}&account=${file.accountId}`;
                    if (e.currentTarget.src !== fallbackSrc && !e.currentTarget.src.includes('/api/download')) {
                      e.currentTarget.src = fallbackSrc;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#888888] group-hover:text-white transition-colors">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <div className="flex flex-col gap-1">
          {/* List View (File Explorer) */}
          {files.length === 0 && (
            <div className="text-center py-20 text-[#888888]">
              This folder is empty.
            </div>
          )}
          
          {files.map((file, idx) => {
            const isFolder = file.type === "folder";
            
            return (
              <div 
                key={idx}
                onClick={() => {
                  if (isFolder) {
                    window.location.href = `/drive?path=${encodeURIComponent(currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`)}`;
                  } else {
                    setSelectedIndex(idx);
                  }
                }}
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
                  <span className="truncate font-medium group-hover:text-white text-[#EAEAEA]">{file.name}</span>
                </div>
                <div className="col-span-3 text-sm text-[#888888]">
                  {formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}
                </div>
                <div className="col-span-3 text-sm text-[#888888]">
                  {isFolder ? "—" : formatBytes(Number(file.sizeStr))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
