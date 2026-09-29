# 0021. Event chat by polling, following organizers, and no friend requests for now

- Status: Accepted (founder decisions on Phase 4a, 2026-09-29)
- Date: 2026-09-29

## Context

Phase 4 of the build prompt starts the social layer with friends (SOC-02), a feed (SOC-03) and "friends going". The founder decided against friend requests for now: they would rebuild Facebook without adding much, and may come back later with communities. What participants lack instead is a way to reach an organizer inside Doulisha (today they look for the organizer's Instagram or Facebook), and a place where a private event's guests can share details. The spec lists these as direct messages to organizers (COM-05) and event chat (COM-06). The build prompt's technology choice for realtime is "polling with TanStack Query for the MVP; Ably or Pusher behind an interface for chat in V1".

## Decision

- **No friendships yet.** SOC-02 is postponed (OPEN_QUESTIONS Q27). The feed and the member pages therefore do not show "friends going"; the `friendships` table stays unused.
- **Follow organizers (SOC-01):** a Follow button and a follower count on organizer pages, which also list the organizer's past public events ("what they organized"). Owners cannot follow themselves.
- **Feed (SOC-03), `/feed` ("Mon fil"):** upcoming public events of the organizers the member follows, and up to six organizers to follow (those with the most upcoming public events). Private and unlisted events never appear (TRS-06).
- **Chat, two kinds of conversation** (`conversations`, `messages`, `conversation_reads`, migration 0005):
  - `organizer`: one private thread per participant and public or unlisted event, between that participant and whoever manages the event (creator, organizer profile owner, admins). Opened from "Ask the organizer" on the event page; signed-in members only.
  - `group`: one chat per private event, for its hosts and the guests who answered "going" or "maybe", including guests without an account (anonymous session, shown with the name they gave).
  - `chatRole` (unit tested) decides access; a conversation someone cannot see answers "not found", so nobody learns it exists.
  - Messages are 1–2000 characters; one person may send 20 a minute.
- **Delivery by polling:** an open conversation refetches every 5 seconds while the tab is visible; the inbox (`/messages`) and the unread badge (menu, avatar dot) refresh on navigation. No new service or account is needed. A push-based provider (Ably, Pusher) can replace the polling later behind the same procedures.
- **No email or SMS for new messages yet:** the badge is the notification until real providers arrive (Phase 6, COM-01).

## Consequences

- A message takes up to 5 seconds to appear on the other side, and an idle open conversation costs one small query every 5 seconds. Fine at MVP scale; revisit with a push provider when traffic grows.
- Report and block (Phase 4b) will cover messages and conversations.
- If friendships come back, "friends going" and a friends' section of the feed can be added without changing the chat.
