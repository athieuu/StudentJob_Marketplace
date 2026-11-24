# AI eval data (synthetic)

`node ai/eval/build_dataset.js` regenerates `data/` (reproducible). Everything is invented: people, companies,
`@example.test` emails, `0900 000 xxx` phones. No real CV and nothing from `backend/uploads` is used.

| Path | Content |
|---|---|
| `data/cvs/cv01..cv10.txt` | 10 CVs: 5 vi (cv01,03,04,06,09), 3 en (cv02,07,08), 2 mixed (cv05,10). Covers: no experience, project-heavy, career change, 2-column messy layout (cv08), no-diacritics (cv04), very long (cv09), gender/DOB/marital/photo lines (cv10) |
| `data/gold/cvXX.json` | expected extraction (`cv_extract.v1`; contact fields intentionally absent) |
| `data/jobs/job01..05.json` | 2 IT, 1 retail, 1 marketing, 1 office (job05 has no skill section -> expected `[]`; job02 is English) with `expected_skills` |
| `data/fit_labels.csv` | 10x5 = 50 pairs. **`draft_ai` is an AI-written draft, NOT human labels.** `reviewer1`, `reviewer2`, `mean_human` are empty: a Vietnamese-speaking reviewer must fill them (open question Q6) before any fit metric is trusted |
| `data/rec_labels.csv` | draft relevance 0/1/2 derived from the draft fit scores (same caveat) |
| `data/assist_inputs/` | 12 inputs: 4 summary, 4 bullets, 4 feedback |
| `data/redteam/` | `payloads.json` (10 injection payloads) + 3 CVs with protected-attribute/photo lines |

A5 harness: `cd backend && npm run ai:eval` (needs root `.env` API_KEY/BASE_URL/MODEL_NAME; real calls, cached in `reports/raw`). Report: `reports/2026-11-24-a5.md`. Not yet done (A7): rewrite rubric + judge calibration. fit_labels are now judged by an LLM (D-AI-LABELS); the reviewer columns stay empty. The default test run (`npm test` in `backend/`) uses no LLM and no network.
