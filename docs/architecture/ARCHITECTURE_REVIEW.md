# Architecture Review

*Reviewer: Principal Software Architect*

## 1. The Real-Time API Trap
**The Assumption:** We can just query Google Drive API when the user opens the app to list files.
**The Flaw:** If a user has 5 accounts, doing a live `files.list` across 5 APIs, paginating the results, merging them in memory, sorting them, and delivering them to the frontend will take 3 to 10 seconds. That violates Design Principle #4 ("Performance is a Feature").
**The Architecture Shift:** Oridam MUST have a local relational database (e.g., SQLite or PostgreSQL) acting as the source of truth for the frontend. The backend queries the local DB in milliseconds. A background worker keeps the local DB in sync with Google Drive using Google's `Changes` API.

## 2. The Identity Mapping Problem
**The Assumption:** We can just store Google's `file_id`.
**The Flaw:** Google's `file_id` is globally unique, but it doesn't tell us *which* account it belongs to without joining tables. More importantly, when we do "Virtual Folder Merging" (combining two "College" folders), the Virtual Folder needs its own Oridam-generated UUID.
**The Architecture Shift:** We need a mapping layer.
- `VirtualFolder`: Created by Oridam (e.g., `id: v_123`, `name: College`).
- `PhysicalMapping`: Links `v_123` to `google_account_1_folder_xyz` and `google_account_2_folder_abc`.
When a user opens `v_123`, the local DB instantly fetches all files linked to both underlying physical folders.

## 3. Upload State Machine
**The Assumption:** Uploads are a simple HTTP POST to Google.
**The Flaw:** A 5GB 4K video upload might fail midway. If we upload directly through our backend, we are paying for massive bandwidth and memory. 
**The Architecture Shift:** We should investigate **Resumable Uploads directly from the Client**. 
The flow: 
1. Client asks Backend: "I have a 5GB file, where does it go?" 
2. Backend checks quotas, selects Account B, and returns a signed Google Drive Resumable Upload URL. 
3. Client uploads *directly* to Google, bypassing our backend bandwidth entirely. 
4. Client notifies Backend on success.

## 4. Competitor Analysis: Why not Rclone?
Rclone is a CLI masterpiece, but its architecture is fundamentally at odds with our product vision. Rclone's `union` remote requires manual configuration of write policies (e.g., `epall`, `mfs`). It exposes the seams. Spacedrive is trying to be a desktop OS file manager. 
Oridam's architecture must be a lightweight Web App (Next.js/React) + API (FastAPI/Go) + SQLite, optimized specifically for abstracting OAuth and merging Drive trees.

## Conclusion
The MVP architecture must prioritize **Local Database Caching** and **Direct-to-Google Client Uploads**. If we try to proxy all file bytes and live API requests through our own backend, we will fail on latency and server costs.
