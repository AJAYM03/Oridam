# Implementation Strategy

*Reviewer: Principal Software Architect*

To avoid the "Rewrite Trap", we will build Oridam in vertical slices. Each phase must leave the project in a usable, testable state. We will not build the entire backend before touching the frontend.

## Phase 0: The Technical Spike (Validation)
**Goal:** Prove we can connect to Google APIs and read data.
**Deliverables:**
- A simple script (Python/Go) that authenticates two Google accounts via OAuth.
- Retrieves total quota and used quota for both.
- Lists the top 5 files in the root directory for both.
**Why:** Validates our OAuth setup and basic API assumptions before touching a web framework.

## Phase 1: Local Database & Sync Core
**Goal:** Mirror Google Drive state to a local SQLite database for a single account.
**Deliverables:**
- SQLite schema for `Accounts`, `Files`, and `Folders`.
- A background worker that pulls all metadata from one Google account and stores it locally.
- A simple API endpoint `/api/files` that returns the local DB contents instantly.
**Why:** The local cache is the hardest architectural piece. We build it first.

## Phase 2: Multi-Account Merging (The VFS)
**Goal:** The illusion of One Place.
**Deliverables:**
- Update sync worker to support 2+ accounts.
- Implement the "Virtual Folder Merging" algorithm in the local DB / Backend layer.
- API `/api/files` now returns a seamlessly merged tree without duplicates.
**Why:** This proves the core product value proposition.

## Phase 3: The Unified UI
**Goal:** Users can browse their unified accounts visually.
**Deliverables:**
- Next.js / React frontend.
- Connect to `/api/files`.
- Instant search and instant folder navigation using the local DB.
- Handle Workspace files (Google Docs) opening in a new tab.
**Why:** The user finally sees the magic.

## Phase 4: The Router & Upload Engine
**Goal:** Users can upload files without choosing an account.
**Deliverables:**
- Drag and drop UI.
- Backend routing algorithm (Largest Free Space).
- Client-to-Google direct Resumable Upload flow.
**Why:** Completes the read/write MVP loop.

## Phase 5: Polish & Edge Cases
**Goal:** Prepare for daily use.
**Deliverables:**
- Handle "Account Quota Exceeded" during upload.
- Implement soft-delete (Trash).
- Handle OAuth token expiration gracefully.
