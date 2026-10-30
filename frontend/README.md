# StudentJob Marketplace — Frontend Demo

A responsive React + TypeScript frontend for a student job marketplace. This project intentionally uses local mock data only: it does not connect to a backend, database, HTTP API, or external authentication provider.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify a production build:

```bash
npm run build
npm run preview
```

## Demo accounts

All seeded demo accounts use password `demo123`.

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@demo.com` | `demo123` |
| Employer | `employer@demo.com` | `demo123` |
| Administrator | `admin@demo.com` | `demo123` |

The login screen includes clickable demo account selectors. Registration also creates a local demo account.

## Routes

### Public

- `/` — Home, category links, featured jobs, and employer call-to-action
- `/jobs` — Search, filters, sort, pagination, and job cards
- `/jobs/:id` — Job details, save action, application workflow, and reviews
- `/login`, `/register` — Simulated authentication
- `/unauthorized`, `*` — Access denied and not found

### Student

- `/student/dashboard` — Application metrics, recent activity, recommendations, profile completion
- `/student/profile` — Edit profile, skills, biography, and CV URL
- `/student/applications` — Search and filter applications
- `/student/applications/:id` — Application detail and status timeline
- `/student/applications/:id/review` — Eligible review form

### Employer

- `/employer/dashboard` — Recruitment metrics, application status, listings, recent applicants
- `/employer/jobs` — Search, filter, sort, close/reopen, edit, and delete own listings
- `/employer/jobs/new` — Create a listing
- `/employer/jobs/:id/edit` — Edit an owned listing
- `/employer/jobs/:id/applications` — Applicants for an owned listing; accept/reject workflow
- `/employer/applications/:id` — Applicant details and CV link

### Administrator

- `/admin/dashboard` — Platform overview and moderation queue
- `/admin/users` — Search, filter, view, activate/deactivate accounts
- `/admin/users/:id` — User details
- `/admin/jobs` — Search, preview, approve/reject job listings
- `/admin/applications` — Platform-wide application overview

## Architecture

- `src/types/` — Shared TypeScript domain types
- `src/data/seed.ts` — Fictional seed users, jobs, applications, and reviews
- `src/services/store.ts` — Local storage-backed mock service layer
- `src/App.tsx` — Routing, layouts, role guards, page flows, and reusable UI
- `src/styles.css` — Shared visual system and responsive layouts

The mock service layer is the replacement point for a future API implementation. Suggested future mappings:

| Mock method | Future API responsibility |
| --- | --- |
| `authService.login/register/logout` | Authentication/session endpoints |
| `jobService.all/byId/save/remove` | Job list/detail/create/update/delete endpoints |
| `applicationService.all/apply/updateStatus` | Application submit/list/status endpoints |
| `userService.save/toggleStatus` | Profile and admin account endpoints |
| `reviewService.create` | Review eligibility and submission endpoint |

## Demo rules and limitations

- Demo authentication is not production-secure. It is only intended for local demonstrations.
- All records and session state are persisted in this browser's `localStorage`.
- Clearing the site's local storage resets the demo data to its seeded defaults.
- Job and application permissions are checked in the frontend for demonstration only. Production authorization must be enforced by the backend.
- New employer-created listings start with `PENDING` moderation status and are not shown in public search until approved.
- A student can apply once per open, approved job. Only accepted applications can be reviewed, and duplicate reviews are blocked.
- No backend, database, real authentication, or network API requests are implemented.
