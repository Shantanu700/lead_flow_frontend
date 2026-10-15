# LeadFlow

**A lightweight, single-screen CRM for managing leads, recording discussions, and scheduling follow-ups.**

LeadFlow helps a sales representative keep lead details, sales status, discussion history, and the next follow-up in one focused workspace. The interface is centered around a lead list, a timeline dialog, and a compact form for creating leads.

> **Project scope:** This README defines the product scope represented by the UI mockups. Features described under “Future Enhancements” are optional additions, not requirements for the initial version. Update implementation and setup details to match the actual repository before publishing.

## Table of Contents

- [Overview](#overview)
- [Core Product Requirements](#core-product-requirements)
  - [Lead List](#1-lead-list)
  - [Today's Follow-ups](#2-todays-follow-ups)
  - [Add New Lead](#3-add-new-lead)
  - [Lead Timeline Dialog](#4-lead-timeline-dialog)
- [Lead Statuses](#lead-statuses)
- [Key Business Rules](#key-business-rules)
- [Suggested Data Model](#suggested-data-model)
- [Suggested API Contract](#suggested-api-contract)
- [Suggested Architecture](#suggested-architecture)
- [Getting Started](#getting-started)
- [Testing Checklist](#testing-checklist)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

## Overview

Sales representatives need a simple way to remember who they spoke to, what was discussed, and when they should follow up. LeadFlow keeps those tasks together without requiring a separate page for every lead.

The initial product is deliberately focused. It does not require login, dashboards, a Kanban board, AI features, email integration, or team management to satisfy the core scope.

## Core Product Requirements

### 1. Lead List

The main screen displays the lead list and a status filter.

Each lead entry must show:

- **Lead name**
- **Company**, when provided
- **Current status badge**
- **Last discussion note**
- **Relative time since the last discussion**, such as “2 hours ago” or “1 week ago”

Selecting a lead opens its timeline dialog on the same screen. It must not navigate to a separate lead details page.

#### Status filters

The list provides filters for:

- All
- New
- Contacted
- Qualified
- Proposal Sent
- Won
- Lost

The filter should update the visible leads without losing the selected lead's saved data. The exact layout can adapt to smaller screens, but every status must remain accessible.

### 2. Today's Follow-ups

Leads with a follow-up scheduled for the current day are displayed in a distinct **Today's Follow-ups** section above the regular lead list.

Each follow-up entry should show:

- Lead name and company
- Current status
- Last discussion note and time since that discussion
- Scheduled follow-up time

Today's follow-ups should remain easy to distinguish from the rest of the list. A lead may also appear in the regular list; the pinned section is a priority view, not a separate lead record.

Follow-up classification must use the application's configured timezone. The UI mockup emphasizes today's follow-ups; highlighting overdue follow-ups is a useful compatible extension.

### 3. Add New Lead

The **Add New Lead** button opens a modal dialog on the same screen.

The form contains:

| Field | Requirement | Behavior |
|---|---|---|
| Full Name | Required | Reject empty or whitespace-only values |
| Company | Optional | May be left blank |
| Phone | Optional | May be left blank |
| Status | Not shown in the creation form | Defaults to `New` |

On save:

1. Validate the required name.
2. Create the lead with status `New`.
3. Close the dialog after a successful save.
4. Refresh or update the list so the new lead appears immediately.
5. Show a useful error if saving fails; do not silently discard the form values.

The initial creation form should remain compact. Additional fields may be added later if they do not make the core workflow unnecessarily complicated.

### 4. Lead Timeline Dialog

Clicking any lead opens a dialog containing its details, status control, discussion history, and note form.

#### Lead header

The dialog header displays:

- Lead name
- Company, when available
- Phone number, when available
- A control to update the lead status
- A control to close the dialog

#### Discussion history

- Display discussion entries in **reverse chronological order**, with the newest first.
- Show each entry's date and time, relative time where useful, and note text.
- If a discussion scheduled a follow-up, show the follow-up date and time with that entry.
- Show a lead-created event when useful, as illustrated in the mockup.

A lead-created event is not a customer discussion. Keep system events distinguishable from user-entered notes.

#### Add a discussion

At the bottom of the dialog, provide:

- A text area for the new discussion note
- An optional **Set Follow-up** checkbox
- A date input, enabled when follow-up scheduling is selected
- A time input, enabled when follow-up scheduling is selected
- A **Save Note** action

The note is the required content for a discussion submission. If follow-up scheduling is enabled, both date and time must be valid.

#### Save behavior

When a note is saved successfully:

1. Add the discussion to the lead's history.
2. If a follow-up was supplied, update the lead's next follow-up date and time.
3. Reflect the new note and follow-up in the open dialog and lead list immediately.
4. Display the latest note and its relative timestamp in the lead list.
5. Preserve the previous discussion entries.

If saving fails, show an error and keep the unsaved content available for correction.

#### Status updates

The status selector in the dialog supports all six statuses: `New`, `Contacted`, `Qualified`, `Proposal Sent`, `Won`, and `Lost`.

A successful status change should update the badge in the dialog and the corresponding lead-list entry immediately. Persist the change in the backend if a backend is used.

## Lead Statuses

| Status | Meaning |
|---|---|
| `New` | The lead has been added but has not yet been contacted. |
| `Contacted` | Initial outreach or contact has taken place. |
| `Qualified` | The lead appears to be a relevant sales opportunity. |
| `Proposal Sent` | A proposal or quotation has been shared. |
| `Won` | The opportunity has been successfully converted. |
| `Lost` | The opportunity is no longer active or was not converted. |

Status colors should be consistent across the list, follow-up section, and timeline dialog. Color must not be the only way a status is communicated; the status text should always be visible.

## Key Business Rules

These rules are important to keeping the list and timeline consistent:

1. **One lead, one identity:** A lead has a stable identifier independent of its name or company.
2. **Name is required:** Trim whitespace and reject an empty name.
3. **Status defaults to New:** Newly created leads start with `New`.
4. **Discussion history is append-only by default:** Adding a note must not overwrite earlier notes.
5. **Latest note is derived from history:** The list's last-note preview should reflect the newest discussion, not a manually maintained unrelated text field.
6. **Discussion time and follow-up time are different:** The discussion timestamp records when the note was logged; the follow-up timestamp records when the rep intends to contact the lead.
7. **Follow-up saves update the lead:** Scheduling a follow-up from a discussion updates the lead's next follow-up field.
8. **Today's follow-ups are date-aware:** Determine “today” in the configured application timezone.
9. **Won and Lost are valid statuses:** These statuses remain visible and filterable; they are not removed from the lead list.
10. **UI state follows save results:** Reflect persisted changes after success, and show an error instead of pretending a failed request succeeded.

If the product later supports multiple future follow-ups per lead, introduce a separate follow-up model and define which pending follow-up is displayed as the lead's next follow-up.

## Suggested Data Model

The following is a suggested implementation, not a claim about the current repository's models.

### Lead

| Field | Purpose |
|---|---|
| `id` | Stable unique identifier |
| `name` | Required full name |
| `company` | Optional company name |
| `phone` | Optional phone number |
| `status` | One of the six supported statuses; defaults to `New` |
| `next_follow_up_at` | Optional date and time of the next follow-up |
| `created_at` | Creation timestamp |
| `updated_at` | Last modification timestamp |

### Discussion

| Field | Purpose |
|---|---|
| `id` | Stable unique identifier |
| `lead_id` | Lead associated with the discussion |
| `note` | Required discussion text |
| `created_at` | When the note was recorded |
| `follow_up_at` | Optional follow-up scheduled with this note |

A discussion can store the follow-up date selected when that note was created, while `Lead.next_follow_up_at` provides the current next follow-up used by the lead list. Keep the two values synchronized as part of the same successful operation.

For a relational backend, adding a discussion and updating the lead's follow-up should happen in a database transaction so the two records cannot be left inconsistent.

## Suggested API Contract

If LeadFlow uses a REST API, the following endpoints are a useful starting point. Adapt them to the actual implementation.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/leads/` | List leads; optionally filter by status |
| `POST` | `/api/leads/` | Create a lead |
| `GET` | `/api/leads/{id}/` | Retrieve lead details |
| `PATCH` | `/api/leads/{id}/` | Update lead status or editable fields |
| `GET` | `/api/leads/{id}/discussions/` | Retrieve discussion history |
| `POST` | `/api/leads/{id}/discussions/` | Add a discussion and optional follow-up |
| `GET` | `/api/follow-ups/today/` | Retrieve leads with follow-ups scheduled today |

### Example: create a lead

```json
{
  "name": "Sarah Connor",
  "company": "Acme Corp",
  "phone": "555-0199"
}
```

The server should assign the lead a stable ID and default its status to `New`.

### Example: update a lead's status

```json
{
  "status": "Proposal Sent"
}
```

### Example: add a discussion with a follow-up

```json
{
  "note": "Sent pricing tier PDF. The customer will review it with her boss.",
  "follow_up_at": "2026-10-16T14:00:00+05:30"
}
```

The API should validate the timestamp and return the saved discussion and updated lead follow-up information, or provide a clear validation error. The timestamp above is an illustrative example.

## Suggested Architecture

The project can be implemented with a frontend-only store for a prototype or with a persistent backend for a more complete application.

One suitable full-stack option is:

| Layer | Suggested technology | Responsibility |
|---|---|---|
| Frontend | React or Next.js with TypeScript | Main list, status filters, dialogs, and UI state |
| Styling | Tailwind CSS or an existing component library | Layout, badges, forms, and responsive behavior |
| Backend | Django REST Framework | Validation, lead operations, discussion creation, and status updates |
| Database | PostgreSQL | Persistent lead and discussion records |

### Request flow

```text
Lead list / Timeline dialog
          |
          v
     Frontend state
          |
          v
      REST API
          |
          v
  Business validation
          |
          v
      Database
          |
          v
 Updated lead + discussion
          |
          v
 Refresh list and open dialog
```

The mockups represent a single-screen user experience. This does not mean the app must have only one backend endpoint or one component; the UI can be divided into reusable components while keeping navigation on the same screen.

## Getting Started

LeadFlow has two repositories: this Next.js frontend and the Django REST backend, **[lead_flow_backend](https://github.com/Shantanu700/lead_flow_backend)**. The app needs both. They run over HTTPS on `localhost`, so the browser treats them as the same site and the login session cookie works.

### Prerequisites

- [Git](https://git-scm.com)
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose (runs the backend, Postgres and Redis)
- [Bun](https://bun.sh) (the frontend's package manager)
- [mkcert](https://github.com/FiloSottile/mkcert) (local HTTPS certificates that browsers trust)

### Steps

1. **Clone both repositories side by side:**
   ```bash
   mkdir leadflow && cd leadflow
   git clone https://github.com/Shantanu700/lead_flow_backend.git backend
   git clone https://github.com/Shantanu700/lead_flow_frontend.git frontend
   ```
2. **Trust local HTTPS certificates** (once per machine; it may ask for your password):
   ```bash
   mkcert -install
   ```
3. **Start the backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Set DJANGO_SECRET_KEY in .env, e.g. to the output of:
   python3 -c "import secrets; print(secrets.token_urlsafe(50))"
   mkdir -p certs
   mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1 ::1
   docker compose -f docker/dev/docker-compose.yml up -d --build
   docker logs -f leadflow_dev_web   # wait for "Starting development server", then Ctrl+C
   ```
   The first start creates the database, runs the migrations, loads sample data and prints the demo login (`demo@example.com` and its password; set `DEMO_PASSWORD` in `.env` beforehand to choose it). The API is at https://localhost:8011, with docs at https://localhost:8011/api/schema/swagger-ui/.
4. **Start the frontend** (in a second terminal, from the `leadflow` folder):
   ```bash
   cd frontend
   bun install
   mkdir -p certificates
   mkcert -cert-file certificates/localhost.pem -key-file certificates/localhost-key.pem localhost 127.0.0.1 ::1
   bun dev
   ```
5. **Open https://localhost:3000** and sign in as `demo@example.com` with the password from step 3, or register a new account.

### Stopping and resetting

```bash
cd backend
docker compose -f docker/dev/docker-compose.yml down      # stop; the data is kept
docker compose -f docker/dev/docker-compose.yml down -v   # stop and delete the database
docker exec leadflow_dev_web python manage.py seed_fixtures --reset   # fresh sample data
```

The frontend calls the API at `https://localhost:8011` by default. To use another address, set it in `.env.local` (gitignored):

```bash
NEXT_PUBLIC_API_URL=https://localhost:8011
```

### After an API change

The typed API client in `src/client/` is generated from the backend's OpenAPI schema. With the backend running, regenerate it (never edit `src/client/` by hand):

```bash
bun run openapi-ts
```

### Checks

```bash
bun run typecheck     # TypeScript
bun run lint          # ESLint
bun run format        # Prettier
```

Backend tests run inside the `leadflow_dev_web` container with `python -m pytest`.

### How this build differs from the suggested contract

- Updates use `PUT /api/leads/{id}/` (not `PATCH`).
- `GET /api/leads/` is paginated (`page`, `page_size` up to 50) and also takes `status`, `q` (searches name, company, phone and the latest note) and `ordering=recent|value|name`.
- Leads also carry an estimated `value` (₹) and a `source`.
- Extra endpoints: `/api/follow-ups/overdue/`, `/api/follow-ups/upcoming/`, and per-tab figures at `/api/stats/dashboard|leads|reports/`.
- Sign-in is required (email and password, Django session).

## Testing Checklist

Use the following acceptance checklist to validate that the implementation matches the mockups and requirements.

### Lead list

- [ ] All six status filters are available, including `Won` and `Lost`.
- [ ] Every lead shows its name, status, latest note preview, and time since discussion.
- [ ] Company is displayed when present and omitted gracefully when absent.
- [ ] Clicking a lead opens the timeline dialog without navigating away.
- [ ] A new note or status change appears in the list after saving.

### Today's follow-ups

- [ ] Leads scheduled for today appear in a separate section above all leads.
- [ ] Each entry displays the scheduled follow-up time.
- [ ] The section uses the configured timezone to determine today's date.
- [ ] A lead without a follow-up is not shown in this section.

### Add New Lead

- [ ] The Add New Lead button opens a modal.
- [ ] Name is required; company and phone are optional.
- [ ] A new lead defaults to `New`.
- [ ] Successful saving adds the lead to the list and closes the modal.
- [ ] Validation and server errors are clearly communicated.

### Timeline dialog

- [ ] The newest discussion appears first.
- [ ] Each discussion displays its timestamp and note.
- [ ] The status can be changed using the dialog's status selector.
- [ ] Follow-up date and time controls are optional.
- [ ] When follow-up scheduling is enabled, date and time are both validated.
- [ ] Saving a note with a follow-up updates the lead's next follow-up field.
- [ ] Earlier discussions remain visible after a new note is saved.
- [ ] Failed saves do not discard the user's note without warning.

### General quality

- [ ] Dialogs can be closed using their close control and, where supported, Escape.
- [ ] Forms have accessible labels and visible validation messages.
- [ ] The layout remains usable on smaller screens.
- [ ] API validation and persistence rules are tested if a backend is used.

## Future Enhancements

The following are optional extensions. They are not required to match the supplied UI mockups.

### Useful next steps

- Search by lead name, company, or phone
- Sort leads by recent discussion or follow-up time
- Highlight overdue follow-ups
- Record status-change events in the timeline
- Add email addresses, lead source, tags, and next-action text
- Add CSV import/export and duplicate detection
- Add a Kanban pipeline and basic sales analytics
- Send optional in-app or email reminders

### Advanced possibilities

- Explainable lead scoring
- AI-generated discussion summaries and suggested next actions
- Email templates and provider integration
- Team assignments and role-based permissions
- Conversion analysis and sales forecasting

Build these only after the core list, timeline, status update, and follow-up workflows are reliable.

## Contributing

1. Create an issue describing the proposed change.
2. Make a focused branch.
3. Keep changes aligned with the product scope and include tests for business rules.
4. Run the relevant linting, type checks, and test suite.
5. Open a pull request describing the change and any configuration or migration impact.

Update this README when the required behavior or setup instructions change.

## License

No license is specified in this document. Add a `LICENSE` file before distributing the project under an open-source license.
