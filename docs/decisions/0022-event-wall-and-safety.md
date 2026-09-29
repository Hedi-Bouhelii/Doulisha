# 0022. Event wall, report and block, member pages and privacy settings

- Status: Accepted (Phase 4b, founder decisions of 2026-09-29)
- Date: 2026-09-29

## Context

Phase 4b completes the MVP social layer the founder kept after dropping friend requests (ADR 0021): the event wall with reactions and comments (SOC-04, SOC-05), report and block (TRS-03), privacy settings (ACC-06) with the member pages they control, and proof that private events stay private (TRS-06). The founder asked for no age restrictions beyond what an organizer states on the event (TRS-05 not built; OPEN_QUESTIONS Q28).

## Decision

- **Wall on public and unlisted event pages** (`wall` router, `posts`, `comments`, `reactions`, `media`). Everyone reads it; signed-in members post (text up to 2000 characters and up to 4 photos uploaded as `post-photo`), comment (up to 1000) and react (one of like, love, fire, clap, haha per post or comment; tapping again removes it). The author, the event's organizers and admins can delete a post or comment (soft delete). Organizers' posts carry an "Organizer" badge. Limits: 10 posts and 30 comments an hour. Private events have no wall: their group chat plays that role, and the wall answers "not found" for them.
- **Report** (`safety.report`): events, posts, comments, members, organizers and chat messages (`report_target` gains `message`, migration 0006). A reason (spam, harassment, inappropriate, scam, other) and optional details. One open report per person and target; 20 a day. Reports wait for the moderation queue (ADM-02, Phase 5). Only people in a conversation can report its messages.
- **Block** (`safety.block`, `blocks`): the blocker no longer sees the blocked person's posts, comments and chat messages (nor counts them as unread); the blocked person cannot comment on the blocker's posts, start an organizer thread with an organizer who blocked them, or write in an organizer thread with them. Group chats stay open, messages are only hidden. Nobody is told. "My account" lists blocked people with "Unblock".
- **Member pages** `/members/{id}`: name, photo, city, bio, member since, the organizer page they run, and the upcoming public events they booked. Guests without an account have none. Pages are `noindex`. Report and block from the page.
- **Privacy settings (ACC-06)** in "My account": profile public or private (a private page shows only name and photo) and events attended visible to everyone or only to the member (default: only the member). The database's `friends` values read as private until friendships exist; "who can invite me" is not shown because invitations go by link only (Q28).
- **Refreshing after a change** cancels a load still in flight before invalidating, so a slow first load cannot bring back the old list (found by the E2E tests).
- **TRS-06** is covered by an integration test: private and unlisted events never appear in the public listing, text search, the feed or the sitemap, and have no wall.

## Consequences

- Moderation stays manual until the Phase 5 queue; reports are visible meanwhile in the admin data explorer (`reports` table).
- Photo URLs come from the storage provider; with local storage they work on one server only (R2 in Phase 6, Q19).
- A blocked person still sees the blocker's public posts: blocking protects the blocker, it does not hide them.
