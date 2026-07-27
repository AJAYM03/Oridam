# Edge Cases

*Reviewer: Principal Software Architect*

To preserve the "One Place" illusion, Oridam must elegantly handle the chaotic reality of multiple distributed systems failing independently.

## 1. Revoked OAuth Access
**Scenario:** A user changes their Google password for Account #3, invalidating the refresh token.
**Expected Behavior:** Oridam MUST NOT fail globally. The UI should show a non-intrusive warning: "Account 3 needs re-authentication." Files from Account 3 should still appear in search results (served from local DB cache) but be greyed out or marked "Offline".

## 2. Duplicate File Names
**Scenario:** The user has `Resume.pdf` in Account 1 and `Resume.pdf` in Account 2, both in the root directory.
**Expected Behavior:** The UI must display both files. Since Oridam merges folders, the root folder will just show two files named `Resume.pdf`. This matches native OS behavior when searching, though UI could append an indicator if necessary (not recommended for MVP to preserve simplicity).

## 3. Conflicting Folders
**Scenario:** Account 1 has a folder named `Photos`. Account 2 has a *file* named `Photos` (no extension).
**Expected Behavior:** The UI treats them as separate entities. The folder `Photos` merges with any other folders named `Photos`. The file remains a file.

## 4. Quota Exhaustion During Upload
**Scenario:** Account 1 has 1GB free. User uploads a 2GB file. Oridam's router incorrectly selects Account 1 because the DB cache was stale.
**Expected Behavior:** The Google API will throw a 403 `storageQuotaExceeded`. The backend must catch this, immediately mark Account 1 as full in the local DB, and automatically retry the upload using Account 2 transparently. The user should not see an error.

## 5. Cross-Account Moves
**Scenario:** A user drags a file from the virtual folder `Work` (which physically lives on Account 1) to `Personal` (which physically lives on Account 2).
**Expected Behavior:** Google Drive API cannot move files between accounts. Oridam must catch this action, download the file to the local server in memory (or temp disk), upload it to Account 2, and delete the original from Account 1. This is a "Virtual Move".

## 6. Offline / Internet Failure
**Scenario:** Internet dies while browsing the Oridam web UI.
**Expected Behavior:** Since Oridam relies on a local database for metadata, browsing and searching should remain instantaneous. Only opening/downloading a file will fail. This makes Oridam feel significantly faster and more resilient than the web version of Google Drive.
