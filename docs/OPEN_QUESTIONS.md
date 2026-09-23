# Open questions

For each question, the **Assumption** is what the build does until you decide. Answer in place (fill in **Decision** and the date) and the code will follow.

Questions 5 to 8 repeat or depend on the founder questions in specification section 12.

---

### Q1. Where is the existing MVP source code?

- **Asked:** 2026-09-23 (Phase 0)
- **Context:** The build prompt says to move the existing Next.js MVP into `apps/web`. This folder only held the specification and the prompt.
- **Assumption:** Start `apps/web` fresh. The audit ([AUDIT.md](AUDIT.md)) is based on spec section 4. If you share the old repository, I will re-check it and move over anything worth keeping, such as copy, images or the logo.
- **Decision (2026-09-24):** There is no old source code. Everything is built from scratch.
  - This repository is the **web application only**.
  - The mobile app will be a separate project, created later (ADR 0006).

### Q2. Official spelling, domain and social handles

- **Asked:** 2026-09-23
- **Context:** The spec says the site uses "Dolisha" and the logo "Doulisha". ORG-04 mentions `doulisha.tn`.
- **Assumption:** "Doulisha" everywhere. The mobile app IDs are `tn.doulisha.app` (Android package and iOS bundle) with the deep-link scheme `doulisha://`. **The Android package name cannot change after the first Play Store upload**, so please confirm it before Phase 3.
- **Decision (2026-09-24):** Confirmed: "Doulisha", with app ID `tn.doulisha.app` and the `doulisha://` scheme. The mobile repository will use them.

### Q3. GitHub repository

- **Asked:** 2026-09-23
- **Context:** CI (`.github/workflows/ci.yml`) can only run once the code is pushed to GitHub.
- **Assumption:** The repository is local only for now. You create the GitHub repository (organization and name) and push `main`. Neon branch-per-PR also needs `NEON_API_KEY` and `NEON_PROJECT_ID` as repository secrets from Phase 1.
- **Decision (2026-09-24):** The founder creates the GitHub repository after Neon is linked. Neon was linked on 2026-09-24 (project `delicate-brook-47760427`).

### Q4. Default language when detection fails

- **Asked:** 2026-09-23
- **Context:** The spec says the language is auto-detected and switchable, but not which one to fall back to.
- **Assumption:** French (`defaultLocale = 'fr'` in `packages/i18n`). Arabic is chosen automatically when the browser or phone asks for it.
- **Decision:**

### Q5. Brand identity beyond outdoor (spec section 12, question 1)

- **Asked:** 2026-09-23
- **Context:** The mountain and sun logo reads as outdoor-only.
- **Assumption:** Keep the palette from the spec (green `#2F5D3A`, terracotta `#C4623A`, cream `#F7F1E5`). Placeholder icons are used until a logo file is provided.
- **Decision:**

### Q6. Collecting money: marketplace or connect-only? (spec section 12, question 3)

- **Asked:** 2026-09-23
- **Context:** This changes the payment flows in Phase 2 and Phase 6 (who receives online payments, held funds, payouts).
- **Assumption:** Build the ledger so that both options work. The MVP uses `mock` and `manual` providers, and manual payments (cash, transfer, D17 with proof) go straight to the organizer.
- **Decision:**

### Q7. Provider directory timing

- **Asked:** 2026-09-23
- **Context:**
  - The spec marks PRV-01 and PRV-02 (provider directory) as **MVP**, and the roadmap in section 11.2 lists the "provider directory" in the MVP+ phase.
  - The build prompt lists the "providers marketplace" as V1.
  - The prompt's Phase 2 to 6 plan does not include the directory.
- **Assumption:** Only the marketplace (PRV-03 and later) is V1. The directory (profiles by type and city, contact by call or WhatsApp) is MVP. It would come in Phase 5 next to verification, unless you say otherwise.
- **Decision (2026-09-24):** Follow the recommendation. The provider directory (PRV-01, PRV-02) is MVP and is built in Phase 5. The marketplace (PRV-03 and later) is V1.

### Q8. Cities for launch (spec section 12, question 4)

- **Asked:** 2026-09-23
- **Assumption:** Seed data and default filters use Greater Tunis, Sousse and Sfax, plus nationwide outdoor destinations (for example Ain Draham).
- **Decision:**

### Q9. Neon region: us-east-2 or Frankfurt?

- **Asked:** 2026-09-24
- **Context:**
  - The Neon project `Doulisha` was created in **aws-us-east-2 (Ohio)**. The region of an existing project cannot be changed.
  - From Tunisia, the round trip to Frankfurt (aws-eu-central-1) is roughly 3 times shorter than to Ohio. Every server-rendered page and API call pays that round trip, which counts against the "event list in under 2 s on 4G" budget.
  - Law 2004-63 (spec section 8) regulates transfers of personal data abroad. Hosting in the EU (under GDPR) is likely easier to justify to the INPDP than the US. This needs the lawyer's confirmation.
  - The database is still empty, so moving now costs nothing. After launch, moving requires a data migration.
- **Assumption:** Ask before Phase 1 writes any data.
- **Decision:**

### Q10. Auth: self-managed Better Auth or Neon Managed Auth?

- **Asked:** 2026-09-24
- **Context:**
  - Neon Auth (Managed Better Auth) is already enabled on the `production` branch.
  - The Neon Auth skill (checked 2026-09-17) says Managed Auth:
    - supports phone OTP only for users who already exist (no sign-up with a phone number);
    - offers Google, GitHub and Vercel social login out of the box.
  - Spec ACC-01 requires sign-up by phone OTP, plus Facebook and Apple login.
- **Assumption:** Self-managed Better Auth on Neon Postgres, as in ADR 0003. This is also what the Neon skill recommends when a required feature is outside Managed Auth. Managed Auth stays unused.
- **Decision:**
