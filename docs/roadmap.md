# Roadmap

Tama already covers the core of a hosted kanban tool: boards with kanban, grid,
list and calendar views, cards with tasks, labels, custom fields, due dates and
attachments, card templates, saved board filters, real-time updates, Trello import, webhooks,
notifications and an MCP server for AI assistants.

This page lists the features people most often miss when they move from Trello,
Asana or similar tools, and how each one fits into the code. Order is by value
to users against effort. Each feature ships as its own pull request, with the
server and client changes in separate commits.

Progress:

- [x] 1. Saved filters ([#7](https://github.com/jakaria-istauk/tama/pull/7))
- [x] 2. Calendar view ([#11](https://github.com/jakaria-istauk/tama/pull/11))
- [x] 3. Card templates ([#15](https://github.com/jakaria-istauk/tama/pull/15))
- [ ] 4. Recurring cards
- [ ] 5. Automation rules
- [ ] 6. Start dates and timeline view
- [ ] 7. Card dependencies
- [ ] 8. Board templates
- [ ] 9. Email to board
- [ ] 10. Time reports

| # | Feature | Status | Size |
| --- | --- | --- | --- |
| 1 | Saved filters | ✅ Done ([#7](https://github.com/jakaria-istauk/tama/pull/7)) | M |
| 2 | Calendar view | ✅ Done ([#11](https://github.com/jakaria-istauk/tama/pull/11)) | M |
| 3 | Card templates | ✅ Done ([#15](https://github.com/jakaria-istauk/tama/pull/15)) | M |
| 4 | Recurring cards | ⏭️ Next | M |
| 5 | Automation rules | 📋 Planned | L |
| 6 | Start dates and timeline view | 📋 Planned | L |
| 7 | Card dependencies | 📋 Planned | M |
| 8 | Board templates | 💤 Later | S |
| 9 | Email to board | 💤 Later | L |
| 10 | Time reports | 💤 Later | S |

Each feature must also be exposed through the MCP server (`server/api/controllers/mcp/`)
so AI assistants can use it, and through the REST API and Swagger docs.

## 2. Calendar view ✅ Done

Shipped in [#11](https://github.com/jakaria-istauk/tama/pull/11). A week view
and drag and drop on touch devices are left for later.

Cards with a due date on a month or week calendar; drag a card to another day to
change its due date.

- **Server:** add `calendar` to `Board.Views` (`server/api/models/Board.js`). The
  `default_view` column is plain text, so no migration is needed. Cards already
  carry `dueDate` and `isDueCompleted`.
- **Client:** add `CALENDAR` to `BoardViews` (`client/src/constants/Enums.js`),
  an icon in `client/src/constants/Icons.js`, the view switch in
  `BoardActions/RightSide`, and a `CalendarView.jsx` next to `GridView.jsx` and
  `ListView.jsx` in `client/src/components/boards/Board/`. Dropping a card
  dispatches the existing card update action with the new `dueDate`.
- **Filters:** the view reuses the board's current filters, so filtered cards
  stay hidden.
- **Library:** build the month grid by hand with `date-fns` (already a
  dependency) rather than adding a calendar library.
- **Tests:** a reducer and selector test for cards grouped by day, and a browser
  check of drag to reschedule.

## 3. Card templates ✅ Done

Shipped in [#15](https://github.com/jakaria-istauk/tama/pull/15). Templates are
hidden by the client's list card query rather than left out of board responses,
so the client can list them and open them in the card modal.

Save a card as a template and create new cards from it, with labels, task lists,
custom fields and description filled in.

- **Server:** add an `is_template` boolean to `card` (migration, default
  `false`). Templates live in the board's lists but are hidden from normal views
  and from MCP list results unless asked for. Creating from a template reuses
  `helpers/cards/duplicate-one.js`, then clears `is_template`.
- **Client:** "Save as template" in the card actions menu; a "From template"
  choice in the add-card form of each list; a templates section in board
  settings to rename or delete them.
- **Tests:** controller tests for create-from-template copying labels, tasks and
  custom field values, and that templates do not appear in normal card lists.

## 4. Recurring cards

Create a card on a schedule (daily, weekly on chosen days, monthly on a day) in a
chosen list, from a template card.

- **Server:** a new `card_recurrence` table (`template_card_id`, `list_id`,
  `rule` as an RFC 5545 `RRULE` string, `next_run_at`, `creator_user_id`). A new
  Sails hook `recurrence` runs once a minute, takes due rows with
  `SELECT … FOR UPDATE SKIP LOCKED` so several server instances never create the
  same card twice, duplicates the template and sets the next `next_run_at`.
  Parse rules with the `rrule` package.
- **Depends on:** card templates (3).
- **Client:** a "Repeat" step in the template's card actions with a simple
  picker (every day, every week on …, every month on day …) that writes the rule.
- **Tests:** rule-to-next-run unit tests across month ends and time zones; a hook
  test that two concurrent runs create one card.

## 5. Automation rules

Per-board rules in the form "when this happens, do that", like Trello's Butler.

- **Triggers:** card created in a list, card moved to a list, label added, due
  date passed, all tasks completed.
- **Actions:** move card, add or remove label, add or remove member, set or clear
  due date, mark due date complete, post a comment, send a notification.
- **Server:** `board_automation` table (`board_id`, `trigger` JSON,
  `actions` JSON array, `is_enabled`, `creator_user_id`). Listen on the existing
  `event-bus` hook for card events. Run actions through the same card helpers
  that controllers use, as the rule's creator, so permissions and real-time
  updates work as usual. Mark automated changes in the action log and skip
  triggers caused by the same rule, to stop loops; cap actions per event.
- **Client:** an "Automation" pane in board settings with a list of rules and a
  form that builds trigger and actions from selects.
- **Tests:** a test for each trigger and action, and a loop test (a rule that
  moves cards into its own trigger list runs once).

## 6. Start dates and timeline view

- **Server:** add `start_date` to `card` (migration, nullable), with validation
  that it is not after `dueDate`.
- **Client:** a start date field next to the due date in the card modal; a
  `timeline` board view with one row per list (or per member) and cards drawn
  from start to due date, dragged to move or resize.
- **Depends on:** the calendar view (2), which sets up the view plumbing.

## 7. Card dependencies

"Blocked by" links between cards, shown as a badge on blocked cards.

- **Server:** `card_dependency` table (`card_id`, `blocked_by_card_id`), within
  one project, with a cycle check on insert.
- **Client:** a "Blocked by" section in the card modal with a card search; a
  badge on the card in every view while any blocker is open.
- **Automation:** a trigger "all blockers done" once rules (5) exist.

## 8. Board templates

Create a new board from an existing one, with its lists, labels and custom
fields but no cards (or with template cards only). Extend
`controllers/boards/create.js` with a `sourceBoardId` input next to the existing
Trello `importType`.

## 9. Email to board

Each board gets a private address; an email to it becomes a card, with the body
as description and attachments as files. Needs an inbound mail service (SMTP
receiver or a provider webhook such as Mailgun or Postmark) and is optional per
install, so it is last.

## 10. Time reports

Cards already have a stopwatch. Add a per-board report of time per card, member
and label over a date range, with CSV export. Needs a `card_time_entry` table so
that time is kept per user and per session, not only as a running total.

## Not planned

- **Hosted Tama for third parties.** The PLANKA Community License does not
  allow running it as a commercial service for others.
- **Native mobile apps.** The web app works on phones; effort goes to the
  features above first.
