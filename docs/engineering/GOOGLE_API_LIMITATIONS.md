# Google API Limitations

*Reviewer: Principal Software Architect*

To build a seamless illusion of a single drive, we must perfectly mask the rough edges of the underlying Google Drive REST API (v3). Here are the absolute limits we must design around.

## 1. Rate Limits and Quotas
**The Limit:** Google enforces a default limit of 20,000 requests per 100 seconds per project, and 200 requests per 100 seconds per user. 
**The Risk:** If a user connects 5 accounts and our background worker aggressively polls for changes or attempts to sync a 10,000-file directory simultaneously, we will get `429 Too Many Requests`.
**The Mitigation:** We cannot rely on aggressive polling. We must implement exponential backoff globally across the backend. For initial syncs, we must batch requests (`Batching Requests` in Google API).

## 2. Webhook (Push Notification) Reliability
**The Limit:** Google Drive Push Notifications require a publicly accessible HTTPS endpoint (webhook). Notifications can be delayed, dropped, or arrive out of order. They also expire after a maximum of 1 week (usually 1 day) and must be actively renewed.
**The Risk:** If we miss a webhook when a user deletes a file directly in Drive, our Oridam database becomes stale. The user tries to open a deleted file and gets a 404.
**The Mitigation:** Webhooks are an optimization, not a guarantee. We must implement a "Catch-up Poller" that runs periodically (e.g., every 15 minutes) using the `Changes.list` API with the last known `pageToken` to guarantee state consistency.

## 3. Upload File Size Limits
**The Limit:** Single file uploads over a few megabytes MUST use the Resumable Upload protocol. Maximum file size is 5TB (which exceeds the 15GB quota anyway, so quota will hit first).
**The Risk:** Uploading a 2GB file directly in a single POST request will fail.
**The Mitigation:** The frontend MUST handle chunked, resumable uploads directly to Google APIs using a pre-authenticated session or signed URL.

## 4. Folder Depth and Path Resolution
**The Limit:** Google Drive does not enforce traditional hierarchical paths (like `C:\Folder\File.txt`). A file can have multiple parents. Folders are just files with the mimeType `application/vnd.google-apps.folder`. Resolving a full path requires multiple recursive API calls.
**The Risk:** Computing "Where is this file?" is computationally expensive via the API.
**The Mitigation:** Our local database must compute and store materialized paths (e.g., using Ltree in Postgres or parent-child joins in SQLite) so the frontend can query the tree instantly.

## 5. Third-Party App Restrictions
**The Limit:** Google restricts what third-party apps can do without a verified OAuth screen. Specifically, the `drive` scope (full access to all files) requires a grueling Google Security Assessment (CASA) that costs $15k-$75k if published externally.
**The Risk:** We cannot launch a public SaaS version of Oridam easily with full Drive access.
**The Mitigation:** 
- MVP Strategy 1: Oridam remains a **self-hosted** open-source tool. Users supply their own GCP OAuth Client ID and Secret. This bypasses the public verification requirement entirely.
- MVP Strategy 2: We request `drive.file` scope (access only to files created by Oridam). This breaks the "Existing files automatically appear" requirement.
**Decision:** Oridam MUST be self-hosted initially. The documentation must clearly guide users on how to create a free GCP project to get their own credentials.
