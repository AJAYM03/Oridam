# Design Principles

## 1. Hide Complexity
If a feature exposes implementation details, redesign it.
Users should never see storage allocation, account selection, or provider IDs. 
**The complexity belongs to the software, not the user.**

## 2. One Click > Ten Options
Automation beats configuration.
Every toggle is a failure to make a decision on behalf of the user. Choose sensible defaults.

## 3. Immediate Familiarity
A Google Drive user must feel at home within seconds.
Don't invent new paradigms unless the old ones are broken.

## 4. Performance is a Feature
Search must feel instant.
Browsing should never require waiting for Google APIs. Speed is trust.

## 5. Trust is Absolute
Files stay in users' Google accounts. We do not intermediate data.
Security decisions always outweigh convenience.

## 6. Subtractive Design
Every new feature must reduce cognitive load. Never increase it.
If we can remove a step, we must.
