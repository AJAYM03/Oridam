# Technical Risks

*Reviewer: Principal Software Architect*

## HIGH: Initial Sync Latency
- **Risk:** When a user first connects an account with 100,000 files, querying all files via `files.list` and inserting them into the local SQLite database could take minutes. The user might think the app is broken if they don't see their files immediately.
- **Mitigation:** The initial sync must be asynchronous. The UI must show a "Syncing..." indicator. We should fetch files at the root level first (depth=0) to populate the initial UI view instantly, then recursively fetch deeper levels in the background.

## HIGH: Virtual Folder Merging Complexity
- **Risk:** Computing the merged view of 5 different "Documents" folders efficiently requires complex SQL queries (e.g., recursive CTEs) or a very smart Application layer. If done poorly, browsing will be slow.
- **Mitigation:** The local DB schema must be highly optimized for hierarchical queries. Use a Materialized Path or Nested Sets model for folder structures.

## MEDIUM: Cross-Account Rate Limiting
- **Risk:** A user does a massive search or mass-delete, triggering hundreds of API calls simultaneously across their accounts, resulting in Google temporarily banning the OAuth app.
- **Mitigation:** All Google API calls must pass through an internal queueing mechanism in the backend that enforces global rate limits (e.g., max 5 requests per second per account).

## LOW: Direct Client Upload Security
- **Risk:** If we use direct-to-Google client uploads, a malicious user could theoretically intercept the signed URL and upload whatever they want.
- **Mitigation:** Since Oridam is self-hosted and for personal use, the threat model of a user hacking their own upload URLs to upload to their own Google Drive is irrelevant. This is accepted risk.
