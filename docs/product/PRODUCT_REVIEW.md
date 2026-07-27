# Product Review

*Reviewer: Principal Product Architect*

## 1. The "Google Workspace" Reality Check
**The Assumption:** Files are just files. Users will download, view, and upload them.
**The Challenge:** Google Drive isn't just a file host; it's an operating system for Google Docs, Sheets, and Slides. These files (`application/vnd.google-apps.document`, etc.) cannot be "downloaded" in a traditional sense without exporting them to PDF/Docx. 
**The Simplification:** Oridam's UI must natively distinguish between "Binary Files" (photos, PDFs) and "Workspace Files". Clicking a Workspace file shouldn't try to download or preview it locally; it must seamlessly open the Google `webViewLink` in a new tab, already authenticated. We must not attempt to build a document viewer.

## 2. The "Folder Merging" Mandate
**The Assumption:** We just list all files in one view.
**The Challenge:** If Account A has a `College` folder and Account B has a `College` folder, showing two `College` folders violates our core tenet ("One Experience"). 
**The Simplification:** The system must perform Virtual Folder Merging. Folders with the exact same name at the same hierarchy level must be rendered as a single folder in the UI. When a user uploads a file into this unified `College` folder, the software decides which underlying account receives it.

## 3. Scope Reduction: Kill "Sharing" for MVP
**The Assumption:** Users need to share files and folders (listed in the MVP).
**The Challenge:** Sharing a single file is easy. But what if a user tries to share a unified folder that contains files from three different Google accounts? Google's permission model doesn't allow cross-account folder sharing natively without creating complex Shared Drives.
**The Simplification:** Remove "Share files" from the MVP. The MVP is strictly for **Personal Unified Access**. Adding sharing introduces permission-state nightmares that will delay launch by months.

## 4. The Allocation Strategy
**The Assumption:** "Automatically store uploads in the appropriate account."
**The Challenge:** How do we decide? If we split a user's photo burst across three accounts, it's messy.
**The Simplification:** Implement a **Largest Free Space** routing policy. Oridam routes the upload to the account with the highest absolute available storage at that moment. The user never sees this happen.

## Conclusion
The product vision is incredibly sharp. By dropping sharing from the MVP and explicitly designing around Folder Merging and Workspace Links, we drastically reduce the engineering surface area while preserving the core "One Place" magic.
