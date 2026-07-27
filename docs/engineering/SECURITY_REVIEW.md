# Security Review

*Reviewer: Principal Software Architect*

## 1. OAuth Storage (The Crown Jewels)
**Threat:** If the Oridam local database is compromised, the attacker gains full read/write access to all connected Google Drive accounts via the refresh tokens.
**Mitigation:** 
- Refresh tokens MUST be encrypted at rest in the database.
- The encryption key (e.g., `ORIDAM_SECRET_KEY`) must be injected via an environment variable and never stored in the database or source code.
- If Oridam is run as a local desktop app, we can use the OS native keychain (e.g., macOS Keychain, Windows Credential Manager) to store the tokens or the encryption key.

## 2. Session Hijacking
**Threat:** A malicious actor on the local network accesses the Oridam web UI.
**Mitigation:** 
- Even for a self-hosted instance, Oridam MUST have a primary authentication layer (e.g., a simple admin password set on first boot) before granting access to the unified interface.
- JWT tokens for the Oridam frontend-backend communication must have short expirations.

## 3. The "Full Scope" Danger
**Threat:** We require the `https://www.googleapis.com/auth/drive` scope to read all existing files. A bug in our Delete logic could wipe out a user's entire digital life across 5 accounts.
**Mitigation:** 
- Oridam MUST NOT implement a hard delete (`files.delete`) in the MVP.
- Deletions from the UI must only call `files.update` setting `trashed: true`. This pushes the file to the Google Drive Trash, giving the user 30 days to recover from any catastrophic bug.

## 4. Privacy
**Threat:** Telemetry or crash reporting accidentally leaking file names.
**Mitigation:** 
- Oridam is entirely self-hosted.
- There must be absolutely zero external telemetry, tracking, or crash reporting back to a central server. The software must be hermetically sealed to the user's environment and Google APIs.
