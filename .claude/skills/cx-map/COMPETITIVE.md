# HeistMind — Value Proposition & Competitive Frame

Sibling of `BRD.md` (the scope-of-record), `STATUS.md` (what's built), `CX-MAP.md` (every page/flow),
and `FINDINGS.md` (the backlog). This doc states **who HeistMind is for and why**, frames it against
its two real competitors (**D&D Beyond** and **Avrae**), and lists the **P0 gaps** that fall out.
When positioning or the competitive picture changes, edit here.

_Last reviewed: 2026-06-28._

---

## Value proposition — one product, two modes

HeistMind isn't a VTT or a live play engine (see `BRD.md` non-goals). It's a **rules-driven character
+ crew manager** for Forged in the Dark, and it earns its keep two ways. State the value by **who's
using it**, not one flat tagline:

### Mode 1 — Character & crew manager (any player)

A **rules-driven FitD builder + sheet**: every action the app offers is legal for your ruleset, so you
don't re-read the book. Build a scoundrel and crew; track stress / harm / XP / coin / per-score gear /
abilities. Bring it to any table — live voice, in person, or here. **This is the "D&D Beyond for
Forged in the Dark" job.**

### Mode 2 — The live mechanical layer for play-by-post (async Discord groups)

Play-by-post (PbP) groups play asynchronously by posting over hours/days, and they split Discord into
**story / mechanics / bookkeeping** channels — narrative prose in the story channel, dice in the
mechanics channel, and character/crew bookkeeping that today is **improvised in Google Sheets or
raw-text channels**. HeistMind replaces that bookkeeping with a **shared, rules-driven mechanical
home**: action/resistance/fortune rolls (position/effect), clocks, stress, crew/faction state, and a
**score-grouped campaign log** the table builds up as the story posts. **The narrative stays in
Discord prose; the mechanics + shared truth live in HeistMind.**

### The Avrae analogy (the wedge)

For D&D PbP, **Avrae + D&D Beyond** give the group a mechanical spine — dice everyone can see (no
fudging), synced character sheets, resource/initiative tracking — while the **story stays human prose
in Discord**. **Forged in the Dark has no Avrae** — PbP Blades groups cobble together a generic dice
bot + a spreadsheet. HeistMind *is* that missing layer for FitD. (Phase 4's Discord bot — specified in
`BRD.md` — makes the parallel literal: roll from Discord, state lands in HeistMind. Even pre-bot, the
web app is the shared mechanical truth.)

### À la carte still holds

Take Mode 1 alone (just your sheet), Mode 2 alone (crew + log for a PbP game), or the full loop.
Nothing forces in-app play; the rules-driven core (CV) is the through-line. (See `BRD.md` P1.)

---

## Competitive frame — two axes

The two modes map to two competitors. HeistMind is explicitly **not** a VTT / marketplace — those are
`BRD.md` non-goals, so the comparisons stay on the character/campaign-manager and PbP-mechanical-layer
axes, not maps/tokens/storefronts.

### Axis 1 — vs D&D Beyond (character & campaign manager, Mode 1)

| Capability | D&D Beyond | HeistMind |
|---|---|---|
| Rules-driven character builder + sheet | ✅ | ✅ (FitD, validated) |
| Logged-in home / "my stuff" dashboard | ✅ | ❌ (flat games list; no dashboard) |
| Characters independent of a campaign ("My Characters") | ✅ | ✅ (Phase 5 — standalone + attach) |
| Mobile app / phone-first at-table sheet | ✅ polished app | 🟡 web, responsive, not phone-optimized |
| Free content to start instantly | ✅ (SRD) | 🟡 bundled starters (Brackwater + builtins) |
| Campaign mgmt / GM sees player sheets | ✅ | ✅ (roster + shared state) |
| Homebrew / custom content | ✅ | ✅ (custom rulesets — a core strength) |
| Dice roller | ✅ | ✅ (optional) |
| Share a character via read-only link | ✅ | ❌ |
| Encounter / initiative tracker | ✅ | N/A (FitD uses clocks, not initiative) |
| Marketplace / maps / VTT | ✅ | ✖ explicit non-goal |

### Axis 2 — vs Avrae + the PbP status quo (async mechanical layer, Mode 2)

For PbP, the real incumbents are **Avrae + D&D Beyond** (D&D groups) and, for FitD, a **generic dice
bot + a Google Sheet / raw-text channel**. This axis is HeistMind's wedge — there is no rules-driven
FitD equivalent.

| Capability (PbP mechanical layer) | Avrae + D&D Beyond | Dice bot + spreadsheet (FitD today) | HeistMind |
|---|---|---|---|
| Shared dice everyone can trust (no fudging) | ✅ | ✅ | ✅ |
| Rolls carry system rules (position/effect, resistance) | ✅ (5e) | ❌ manual | ✅ (FitD) |
| Persistent, synced character sheet | ✅ (DDB) | 🟡 spreadsheet | ✅ |
| Crew / faction / clock state tracked | N/A (5e) | 🟡 manual | ✅ |
| Score-grouped, shared campaign log | ❌ (chat scrollback) | ❌ | ✅ |
| Built for Forged in the Dark | ❌ (D&D only) | 🟡 generic | ✅ |
| Rolls *from inside Discord* | ✅ (bot) | ✅ (bot) | 🔜 Phase 4 (web today) |

**Takeaway:** for FitD PbP there is **no Avrae** — groups improvise. HeistMind already wins on
rules-correctness + shared state; the one thing Avrae has that we don't yet is **in-Discord commands**
(Phase 4, already specified in `BRD.md`).

---

## P0 gaps we're missing (ranked)

Table-stakes for a character/campaign tracker, ranked. These feed the backlog (`FINDINGS.md`) and the
next BRD phases.

1. **A logged-in home / dashboard.** D&D Beyond opens to *your* characters/campaigns; we used to open
   to marketing, then a flat list. → **shipped**: `/` is now a reframed two-mode landing when logged
   out and a personal **dashboard** when signed in (your campaigns + characters + recent activity).
   See "Built" below.
2. ~~**Portable characters ("My Characters").**~~ ✅ **Shipped (Phase 5).** Characters are now
   user-owned and standalone (`/characters`, `/characters/new`, `/characters/[id]`), and **attach
   (link) into a same-ruleset campaign** — single active campaign, `game_id` a nullable pointer
   (`FINDINGS.md` F56, migration `00014`). *Phase 5b (move/clone across campaigns + rulesets) remains.*
3. **Mobile-optimized at-table sheet.** The core use is tracking *during* play, often one-handed on a
   phone; the dense sheet isn't phone-first. *Design/responsive effort.* → **`FINDINGS.md` F57**.
4. **Frictionless first-run.** Bundled starters help, but "load a ruleset → create inside a game" has
   onboarding friction vs "build a character in minutes."
5. **Share a character/sheet (read-only link)** — show your scoundrel without an account. *(P1.)*

The **Avrae-axis gap** (in-Discord rolling) is **already Phase 4** in `BRD.md`, so it's tracked there
rather than repeated here.

---

## Built — reframed landing + a logged-in dashboard

This closes P0 #1 and surfaces P0 #2. **Shipped** — `apps/web/src/app/page.tsx` branches on auth:
`HomePage` (marketing) when logged out, `Dashboard` when signed in. See the CX-MAP `/` section for the
live spec.

### Logged-out landing (`apps/web/src/features/marketing/components/HomePage.tsx` + `landing.*` copy)

The old hero ("Run Forged in the Dark campaigns as async, Discord-style play-by-post") mis-framed the
product as "play the whole game here" and named only the PbP audience, erasing Mode 1. Now:

- **Hero:** *"The mechanical home for your Forged-in-the-Dark crew."* — sub: *"Build rules-valid
  characters and crews, then keep them current wherever you play — at the table, or async on Discord.
  HeistMind handles the dice, gear, XP, clocks, and the campaign log so the rules never slow you down.
  The story's yours; the bookkeeping's ours."*
- **Two "how you'll use it" tracks** (let the visitor self-identify): **At your table** (Mode 1 — a
  living rules-valid sheet) and **Play-by-post on Discord** (Mode 2 — the async mechanical layer),
  tagged ***"Like Avrae for D&D — but built for Forged in the Dark."***
- **Three pillars:** rules-driven · track results from anywhere · take what you want.
- **Dual CTA** (`landing.cta.gm` / `landing.cta.player`): "Run a campaign" / "Join with a code" — both
  start Discord OAuth. _(A concrete sheet/log screenshot is still a nice-to-have, not yet added.)_

### Logged-in dashboard (`/` when authenticated)

`/` is marketing when logged out, the **`Dashboard`** when authenticated (the OAuth callback redirects
to `/`). Over existing repos + the `dashboard.*` i18n keys:

- **Welcome back, {name}** + quick actions (create campaign · join a game · rulesets · upload ruleset).
- **Your campaigns** — `games.findByCreator` + `findByPlayer` unioned (GM/player badge + state).
- **Your characters** — `characters.findByPlayer(userId)` — the **"My Characters" surface** (P0 #2 /
  F56); name · playbook · campaign · status → the sheet.
- **Recent activity** — newest-first merge of `rolls.findByGame` across the user's campaigns.

No schema change, no new data layer — `features/dashboard/{components/Dashboard.tsx,hooks/use-dashboard-data.ts}`
over existing repos. _Note: P0 #2 (truly portable, campaign-independent characters — F56) is still
open; the dashboard surfaces game-scoped characters, it doesn't make them standalone._

---

## Sources

- [Avrae Discord Bot — D&D Beyond](https://dndbeyond-support.wizards.com/hc/en-us/articles/7741344507668-Avrae-Discord-Bot)
- [Play-by-Post: Playing D&D in PbP Forums and Discord — D&D Beyond](https://www.dndbeyond.com/posts/1668-play-by-post-playing-dungeons-dragons-in-pbp)
- [Play-by-Post Mechanics for Discord/Slack — SimpleDnD](https://simplednd.wordpress.com/2024/03/13/play-by-post-mechanics-for-discord-slack-a-how-to-guide/)
- [Running a Play-by-Post RPG: Tools, Tech, and Discord Setup — Terry Jachimiak](https://medium.com/@terry.jachimiak/running-a-play-by-post-rpg-tools-tech-and-discord-setup-actual-plays-and-news-on-ttrpgs-ce267915b920)
- [Blades in the Dark: Play-by-Post Best Practices — Roezmv](https://roezmv.itch.io/blades-in-the-dark-play-by-post-best-practices)
