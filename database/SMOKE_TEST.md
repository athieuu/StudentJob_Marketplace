# Backend smoke test against rebuilt MySQL

The unchanged backend works with the rebuilt schema for the required database-backed flows. **No schema mismatch was observed; no SQL fix is proposed.** The smoke run found three failing behavioural checks and two checks blocked by intentionally absent SMTP. Failures are recorded, not repaired.

## Environment and scope

- Local Windows 11, PowerShell 5.1; Node v24.11.1, npm 11.6.2; Docker Engine 29.0.1 and Compose v2.40.3-desktop.1.
- Base fetched and verified: `origin/Khang` = `dd1540ac1f2efaacb105329760be43ecb8b94aa6`; feature branch `KhangTran/backend-schema-smoke`. Neither main nor DEV was used.
- MySQL 8.4.13, image `mysql:8.4`, local image ID `sha256:a81d043930e51745522bd5c430961cf8286f0a23f0a9a2a6e0108f7ea71b0902`; 14 baseline tables.
- Disposable project `sj-smoke-7661c1e5`, volume `sj-smoke-7661c1e5_demo-data`, bind `127.0.0.1:3317`; HTTP/Socket.IO `127.0.0.1:5000`. Both ports were free before startup. No unrelated listener was stopped.
- Read `pm/STATE.md`, `pm/BACKLOG.md`, `database/README.md`, `database/VERIFICATION.md`, `database/REPORT.md`, and `pm/DB_DESIGN.md`. Root `AGENTS.md`, `VERIFICATION.md`, and `REPORT.md` were absent; the latter two exist under `database/`. No additional AGENTS file was found in backend/database/pm.
- Only report and smoke runner are delivered. App source, migrations, seed, package manifests and lockfiles are unchanged. `npm install --no-package-lock` installed the existing backend dependencies; no extra client tooling was needed. npm reported 2 moderate and 1 high dependency advisories; this task did not audit or alter dependencies.
- All input data is synthetic. Demo account labels refer to `database/seeds/001_demo.sql`; passwords/tokens/hashes are omitted from evidence. Dummy local JWT secret only; SMTP and EMAIL_FROM unset. No real mail service was contacted.

## Reproduce on a fresh disposable database

Run from repository root in PowerShell. Choose a new unique project name and a free DB port for each run. The runner intentionally mutates demo data and expects a pristine seed: job 1 already has a seeded application, so it applies to job 2. It uses Node's built-in HTTP, multipart, and WebSocket clients to exchange real Engine.IO v4 / Socket.IO packets, rather than directly calling controllers/models. PDF (736 bytes) and DOCX (1300 bytes) are generated entirely in memory; no fixture containing personal data is used.

```powershell
$project = 'sj-smoke-7661c1e5' # replace for a later run
$env:STUDENTJOB_DB_PORT = '3317'
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object LocalPort -In @(5000,3317) |
  Select-Object LocalAddress,LocalPort,OwningProcess
# Stop here if either port is occupied; inspect its owner, do not stop it.
docker ps -aq --filter "label=com.docker.compose.project=$project"
docker volume ls -q --filter "label=com.docker.compose.project=$project"
# Both lists must be empty. Never reuse another agent's project or volume.
docker compose -p $project -f database/docker-compose.yml up -d --wait --wait-timeout 240
if ($LASTEXITCODE) { throw 'Compose initialization failed' }
if (Test-Path backend/.env) { throw 'Do not overwrite an existing env file' }
@('PORT=5000','DB_HOST=127.0.0.1','DB_PORT=3317',
  'DB_NAME=studentjob_marketplace','DB_USER=studentjob_demo',
  'DB_PASSWORD=demo-only','JWT_SECRET=synthetic-smoke-only') |
  Set-Content backend/.env -Encoding ASCII
# Ensure inherited DB_*/PORT/JWT_SECRET values do not override this env file.
Get-ChildItem Env:SMTP_* | Remove-Item
Remove-Item Env:EMAIL_FROM -ErrorAction SilentlyContinue
Push-Location backend
npm install --no-package-lock
if ($LASTEXITCODE) { throw 'Dependency installation failed' }
$server = Start-Process node -ArgumentList 'src/server.js' -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput "$env:TEMP/studentjob-smoke.out.log" `
  -RedirectStandardError "$env:TEMP/studentjob-smoke.err.log"
Pop-Location
$ready = $false
for ($i=0; $i -lt 60; $i++) {
  try {
    $health = Invoke-RestMethod 'http://127.0.0.1:5000/api/health/db' -TimeoutSec 2
    if ($health.result -eq 1) { $ready = $true; break }
  } catch {}
  Start-Sleep -Seconds 1
}
if (-not $ready) { throw 'Backend did not become ready; inspect own logs' }
node database/smoke.cjs "$env:TEMP/studentjob-smoke-evidence.json"
$smokeExit = $LASTEXITCODE
$smokeExit # 1 for behavioural failures; 0 if no FAIL rows (BLOCKED can remain)
node --check database/smoke.cjs
```

Treat the final JSON counts as authoritative. The runner checks expected status plus response contents, retains JWTs only in memory, redacts sensitive field names in its output, and times out requests/events. `verify-otp` is explicitly recorded as **not sent**, because delivery cannot occur without SMTP; no guessed OTP or authentication bypass is used. Successful request-otp delivery would require a separate authorized SMTP-sink run to cover actual verification.

## Findings and classification

### Schema

**Zero observed schema defects.** All exercised queries completed without missing table/column, foreign-key, type or constraint errors. CV JSON persistence, conversation pair upsert, messages, profile updates, moderation, applications and OTP persistence worked. There is no failing SQL query/error to report and **no proposed ALTER/CREATE SQL**. Do not apply schema changes to address the code findings below. This is a smoke test, not proof of every possible query, concurrency case, or AI table writer.

### Pre-existing code defects

1. **Rejected job detail leaks through the public endpoint.** After job 4 was rejected, the public list correctly excluded it, but unauthenticated `GET /api/jobs/4` returned 200 and `data.moderation_status="REJECTED"` instead of hiding the record (expected 404). `backend/src/controllers/jobController.js:147` uses the generic lookup, and `backend/src/models/jobModel.js:64` filters only `WHERE j.id = ?`. Backend should enforce public visibility at the public route while retaining authorized employer/admin access. No DDL fix.
2. **Applying to rejected jobs succeeds.** Student `POST /api/applications` with `{"job_id":4,"cover_letter":"Rejected job guard probe"}` returned 201/applicationId 3 (expected rejection). Read-only SQL confirmed `jobs.id=4, moderation_status=REJECTED` joined to `applications.id=3, status=PENDING`. `backend/src/controllers/applicationController.js:51` obtains the generic job and line 59 checks only `status !== "OPEN"`; it never checks moderation. Backend should reject non-APPROVED jobs before inserting. No DDL fix.
3. **Parser MIME validation disagrees (existing B-03).** The identical 736-byte PDF succeeded with `application/pdf`, then returned 400 `"Tệp không đúng định dạng PDF/DOCX."` with `application/octet-stream` (expected success under the route's advertised allow-list). `backend/src/routes/cvParserRoutes.js:37` permits octet-stream; `backend/src/controllers/cvParserController.js:30` rejects it. Align validation in backend. No SQL is involved.
4. **Additional parser-quality observation, outside the three failed assertions:** the PDF response's `skills` was `["JavaScript","React","- 1 of 1 --"]`; DOCX returned exactly `["JavaScript","React"]` for the same text. The synthetic PDF does not contain the page-footer string. `backend/src/controllers/cvParserController.js:38` uses `getText()` output directly and line 17 treats lines after Skills as skills, including the extractor's footer. The successful PDF check asserts email extraction, not exact skill accuracy. Backend should exclude extractor page markers; frontend must continue requiring review before save. This is code/parser quality, not malformed fixtures or schema.

### Missing optional external service: exact SMTP boundary

`POST /api/auth/register/request-otp` reached `verificationModel.saveOtp` (`backend/src/controllers/authController.js:34`), then failed at `sendOtpEmail` (line 38). The server error was `SMTP chưa được cấu hình trong file .env`, thrown by `backend/src/services/emailService.js:7-8` before transport creation or network connection. HTTP returned 500 `"Không thể gửi OTP. Kiểm tra cấu hình SMTP."`.

Read-only SQL found **1 unverified email_verifications row** for the synthetic registration and **0 users rows** for that address. Neither OTP hash nor registration payload was selected or printed. This proves persistence preceded the mail boundary. OTP delivery and successful verification/creation are BLOCKED; no schema defect or proven OTP-verification code failure is claimed. Job creation/moderation and application/status notifications logged the same SMTP configuration error but caught it and still persisted successfully; their HTTP checks pass, their email delivery remains untested.

## Persistence and socket evidence

Both authenticated socket clients received `joined_conversation` for conversation 1. Student `send_message` received `success:true` with message id 2; employer received `receive_message` with the identical id and content. Subsequent employer REST history contained message 2. Read-only SQL independently returned:

```text
id  conversation_id  sender_id  content
1   1                1          Smoke REST message
2   1                1          Smoke socket message
```

Application 2 accepted the synthetic PDF through multipart field `cv`; employer view and download returned exactly the original PDF bytes. Student, employer and admin application lists all included it, and ACCEPTED status persisted. CV 2 was created, listed, updated with JSON skills, read back, deleted and subsequently returned 404. The two seeded OPEN/APPROVED jobs were initially visible; created job 3 became visible after approval and rejected job 4 remained absent from the list.

## Cleanup and handoff

Only the recorded backend PID was stopped after verifying its process name/command line. Only the UUID upload returned by this run was removed; existing tracked CVs were untouched. The throwaway ignored `backend/.env` was removed. Scoped `docker compose -p sj-smoke-7661c1e5 -f database/docker-compose.yml down -v` removed this run's container/network/volume. Subsequent project-filtered container/volume listings and the port-5000 listener check were empty. Ignored installed `backend/node_modules` remains available locally; no uploads, env, fixtures, evidence JSON, or runtime logs are committed.

Equivalent cleanup after the reproduction commands (only for resources just created by that run):

```powershell
# Verify this PID is still the Node server you started before stopping it.
Get-CimInstance Win32_Process -Filter "ProcessId=$($server.Id)" |
  Select-Object ProcessId,Name,CommandLine
Stop-Process -Id $server.Id
$generated = Get-Content "$env:TEMP/studentjob-smoke-evidence.json.upload"
if ($generated -notmatch '^[0-9a-f-]{36}\.pdf$') { throw 'Unexpected upload name' }
Remove-Item -LiteralPath (Join-Path 'backend/uploads/cvs' $generated)
Remove-Item -LiteralPath backend/.env
docker compose -p $project -f database/docker-compose.yml down -v
docker ps -aq --filter "label=com.docker.compose.project=$project"
docker volume ls -q --filter "label=com.docker.compose.project=$project"
# Remove only the evidence/marker/log files created by this run if no longer needed.
```

PM: database-backed CV/chat integration was exercised successfully; track the moderation guards and parser issues separately, and keep complete OTP registration blocked pending SMTP-sink testing. Database Engineer: no schema correction is requested by this run; AI tables remain unexercised by the current backend. Frontend: use employer profile id (1), not employer user id (2), for conversation creation; apply first with JSON, then upload multipart `cv` at `/api/applications/:id/cv`; parser field is `file` with precise PDF/DOCX MIME types until B-03 is fixed. Do not rely on list filtering to secure rejected-job detail/application routes.

The checks use synthetic happy paths plus the recorded targeted negative probes. No production DB, real SMTP, real personal documents, browser UI, load, races, authorization isolation between multiple same-role accounts, or new AI writers was tested. Admin profile reads work; profile editing intentionally returns 403. Report status is delivered to the coordinator for tracking; backlog/status files are unchanged.

## Actual run coverage and endpoint evidence
Final HTTP/socket run finished **2026-11-23T10:04:44.370Z** (17:04:44 Asia/Saigon). Runner exit **1**, expected for three accurately captured behavioural failures; syntax check exited 0. The first complete run at 09:37:10 UTC had the same 51/3/2 result. A temporary rerun wrapper initially used the wrong working directory, then a launch retry sent requests before readiness; those infrastructure attempts are excluded from endpoint coverage. The final run waited for DB health, used untouched seeded jobs/users/CVs/chat tables, and completed every check; the previous SMTP-boundary attempt had left only the same synthetic unverified OTP record, which final request-otp upserted.

Counts are assertions/flow steps, not distinct URLs: **53 actual HTTP requests, 2 socket event checks, 1 unsent OTP verification step; 56 total rows**. Normal PDF/DOCX extraction passed the declared email assertion, with the separate PDF skill-quality observation above.

| Flow | PASS | FAIL | BLOCKED |
|---|---:|---:|---:|
| Health | 1 | 0 | 0 |
| Login | 6 | 0 | 0 |
| Profiles | 8 | 0 | 0 |
| Jobs | 8 | 1 | 0 |
| Applications | 10 | 1 | 0 |
| CV builder | 6 | 0 | 0 |
| CV parse | 2 | 1 | 0 |
| Chat | 6 | 0 | 0 |
| Socket.IO | 3 | 0 | 0 |
| OTP | 1 | 0 | 2 |
| **Total** | **51** | **3** | **2** |

Request `null` means no body. Login/registration passwords are redacted and refer to synthetic inputs in the runner/seed. Event rows use the default namespace at `/socket.io/?EIO=4&transport=websocket` (HTTP upgrade); `event` is not an HTTP status. `join_conversation` sends numeric argument `1`; its table object describes that argument. Response evidence below retains relevant safe fields; full raw runtime logs and JWTs are not committed.

| # | Flow / actor | Method / path or event | Safe request / multipart fields | Expected status and outcome | Actual status | Result | Sanitized response evidence |
|---:|---|---|---|---|---|---|---|
| 1 | Health / public | GET /api/health/db | null | 200; MySQL SELECT 1 | 200 | **PASS** | {"status":"OK","database":"Connected","result":1} |
| 2 | Login / public | POST /api/auth/login | {"email":"student.demo@example.com","password":"[redacted]"} | 200; student seed account token and role | 200 | **PASS** | {"message":"Đăng nhập thành công","user":{"id":1,"email":"student.demo@example.com","role":"STUDENT"}} |
| 3 | Login / student | GET /api/auth/me | null | 200; JWT accepted | 200 | **PASS** | {"message":"Xác thực thành công","user":{"id":1,"email":"student.demo@example.com","role":"STUDENT"}} |
| 4 | Profiles / student | GET /api/profile | null | 200; correct role profile | 200 | **PASS** | {"user":{"id":1,"email":"student.demo@example.com","role":"STUDENT","full_name":"Demo Student","company_name":null,"phone":null}} |
| 5 | Login / public | POST /api/auth/login | {"email":"employer.demo@example.com","password":"[redacted]"} | 200; employer seed account token and role | 200 | **PASS** | {"message":"Đăng nhập thành công","user":{"id":2,"email":"employer.demo@example.com","role":"EMPLOYER"}} |
| 6 | Login / employer | GET /api/auth/me | null | 200; JWT accepted | 200 | **PASS** | {"message":"Xác thực thành công","user":{"id":2,"email":"employer.demo@example.com","role":"EMPLOYER"}} |
| 7 | Profiles / employer | GET /api/profile | null | 200; correct role profile | 200 | **PASS** | {"user":{"id":2,"email":"employer.demo@example.com","role":"EMPLOYER","full_name":null,"company_name":"Demo Technology Company","phone":null}} |
| 8 | Login / public | POST /api/auth/login | {"email":"admin.demo@example.com","password":"[redacted]"} | 200; admin seed account token and role | 200 | **PASS** | {"message":"Đăng nhập thành công","user":{"id":3,"email":"admin.demo@example.com","role":"ADMIN"}} |
| 9 | Login / admin | GET /api/auth/me | null | 200; JWT accepted | 200 | **PASS** | {"message":"Xác thực thành công","user":{"id":3,"email":"admin.demo@example.com","role":"ADMIN"}} |
| 10 | Profiles / admin | GET /api/profile | null | 200; correct role profile | 200 | **PASS** | {"user":{"id":3,"email":"admin.demo@example.com","role":"ADMIN","full_name":null,"company_name":null,"phone":null}} |
| 11 | Profiles / student | PUT /api/profile | {"full_name":"Demo Student Smoke","phone":"0900000000","university":"Demo University","major":"Information Technology","bio":"Smoke test"} | 200; updated fields returned | 200 | **PASS** | {"message":"Cập nhật hồ sơ thành công","user":{"id":1,"email":"student.demo@example.com","role":"STUDENT","full_name":"Demo Student Smoke","company_name":null,"phone":"0900000000"}} |
| 12 | Profiles / student | GET /api/profile | null | 200; update persists | 200 | **PASS** | {"user":{"id":1,"email":"student.demo@example.com","role":"STUDENT","full_name":"Demo Student Smoke","company_name":null,"phone":"0900000000"}} |
| 13 | Profiles / employer | PUT /api/profile | {"company_name":"Demo Technology Smoke","phone":"0900000001","address":"Demo City","description":"Smoke test"} | 200; updated fields returned | 200 | **PASS** | {"message":"Cập nhật hồ sơ thành công","user":{"id":2,"email":"employer.demo@example.com","role":"EMPLOYER","full_name":null,"company_name":"Demo Technology Smoke","phone":"0900000001"}} |
| 14 | Profiles / employer | GET /api/profile | null | 200; update persists | 200 | **PASS** | {"user":{"id":2,"email":"employer.demo@example.com","role":"EMPLOYER","full_name":null,"company_name":"Demo Technology Smoke","phone":"0900000001"}} |
| 15 | Profiles / admin | PUT /api/profile | {"full_name":"Admin"} | 403; admin profile editing forbidden | 403 | **PASS** | {"message":"Không có quyền chỉnh sửa hồ sơ"} |
| 16 | Jobs / public | GET /api/jobs | null | 200; two seeded approved jobs | 200 | **PASS** | {"data":[{"id":1,"title":"Part-time Sales Assistant","status":"OPEN","moderation_status":"APPROVED","rejection_reason":null,"company_name":"Demo Technology Smoke"},{"id":2,"title":"Junior Web Developer Intern","status":"OPEN","moderation_status":"APPROVED","rejection_reason":null,"company_name":"Demo Technology Smoke"}]} |
| 17 | Jobs / employer | GET /api/jobs/mine | null | 200; two employer jobs | 200 | **PASS** | {"data":[{"id":2,"title":"Junior Web Developer Intern","status":"OPEN","moderation_status":"APPROVED","rejection_reason":null,"company_name":"Demo Technology Smoke"},{"id":1,"title":"Part-time Sales Assistant","status":"OPEN","moderation_status":"APPROVED","rejection_reason":null,"company_name":"Demo Technology Smoke"}]} |
| 18 | Jobs / employer | POST /api/jobs | {"title":"Smoke approval","description":"Synthetic job","location":"Demo City","salary_min":25000,"salary_max":35000,"job_type":"PART_TIME","deadline":"2026-12-31","status":"OPEN"} | 201; new pending job | 201 | **PASS** | {"message":"Đăng tin thành công. Tin đang chờ admin kiểm duyệt.","jobId":3,"moderation_status":"PENDING"} |
| 19 | Jobs / employer | POST /api/jobs | {"title":"Smoke rejection","description":"Synthetic job","location":"Demo City","salary_min":25000,"salary_max":35000,"job_type":"PART_TIME","deadline":"2026-12-31","status":"OPEN"} | 201; second pending job | 201 | **PASS** | {"message":"Đăng tin thành công. Tin đang chờ admin kiểm duyệt.","jobId":4,"moderation_status":"PENDING"} |
| 20 | Jobs / admin | GET /api/admin/jobs/pending | null | 200; both created jobs pending | 200 | **PASS** | {"data":[{"id":4,"title":"Smoke rejection","status":"OPEN","moderation_status":"PENDING","rejection_reason":null,"company_name":"Demo Technology Smoke"},{"id":3,"title":"Smoke approval","status":"OPEN","moderation_status":"PENDING","rejection_reason":null,"company_name":"Demo Technology Smoke"}]} |
| 21 | Jobs / admin | PATCH /api/admin/jobs/3/moderation | {"moderation_status":"APPROVED"} | 200; approve | 200 | **PASS** | {"message":"Đã duyệt tin tuyển dụng","jobId":3,"moderation_status":"APPROVED"} |
| 22 | Jobs / admin | PATCH /api/admin/jobs/4/moderation | {"moderation_status":"REJECTED","rejection_reason":"Synthetic rejection"} | 200; reject with reason | 200 | **PASS** | {"message":"Đã từ chối tin tuyển dụng","jobId":4,"moderation_status":"REJECTED"} |
| 23 | Jobs / public | GET /api/jobs | null | 200; approved visible, rejected absent | 200 | **PASS** | {"data":[{"id":3,"title":"Smoke approval","status":"OPEN","moderation_status":"APPROVED","rejection_reason":null,"company_name":"Demo Technology Smoke"},{"id":1,"title":"Part-time Sales Assistant","status":"OPEN","moderation_status":"APPROVED","rejection_reason":null,"company_name":"Demo Technology Smoke"},{"id":2,"title":"Junior Web Developer Intern","status":"OPEN","moderation_status":"APPROVED","rejection_reason":null,"company_name":"Demo Technology Smoke"}]} |
| 24 | Jobs / public | GET /api/jobs/4 | null | 404; rejected job hidden from public detail | 200 | **FAIL** | {"data":{"id":4,"title":"Smoke rejection","status":"OPEN","moderation_status":"REJECTED","rejection_reason":"Synthetic rejection","company_name":"Demo Technology Smoke"}} |
| 25 | Applications / student | POST /api/applications | {"job_id":2,"cover_letter":"Synthetic smoke application"} | 201; create new application (seed already occupies job 1) | 201 | **PASS** | {"message":"Ứng tuyển thành công","applicationId":2} |
| 26 | Applications / student | POST /api/applications/2/cv | {"cv":{"filename":"smoke.pdf","type":"application/pdf","size":736}} | 200; PDF stored and reference updated | 200 | **PASS** | {"message":"Upload CV thành công","cv_url":"private-cv:2b977e20-4055-4e86-9698-775d4ac325fa.pdf"} |
| 27 | Applications / student | GET /api/applications/my | null | 200; student reads persisted application+CV | 200 | **PASS** | {"data":[{"id":2,"cv_url":"private-cv:2b977e20-4055-4e86-9698-775d4ac325fa.pdf","status":"PENDING","company_name":"Demo Technology Smoke"},{"id":1,"cv_url":"https://example.com/demo-cv.pdf","status":"PENDING","company_name":"Demo Technology Smoke"}]} |
| 28 | Applications / employer | GET /api/applications/job/2 | null | 200; employer reads application | 200 | **PASS** | {"data":[{"id":2,"cv_url":"private-cv:2b977e20-4055-4e86-9698-775d4ac325fa.pdf","status":"PENDING","full_name":"Demo Student Smoke","phone":"0900000000"}]} |
| 29 | Applications / admin | GET /api/admin/applications | null | 200; admin reads application | 200 | **PASS** | {"message":"Lấy toàn bộ đơn ứng tuyển thành công","data":[{"id":2,"status":"PENDING","cv_url":"private-cv:2b977e20-4055-4e86-9698-775d4ac325fa.pdf","full_name":"Demo Student Smoke","phone":"0900000000","company_name":"Demo Technology Smoke"},{"id":1,"status":"PENDING","cv_url":"https://example.com/demo-cv.pdf","full_name":"Demo Student Smoke","phone":"0900000000","company_name":"Demo Technology Smoke"}]} |
| 30 | Applications / employer | GET /api/applications/2/cv/view | null | 200; same PDF bytes returned | 200 | **PASS** | {"bytes":736,"pdfHeader":"%PDF-","matchesFixture":true} |
| 31 | Applications / employer | GET /api/applications/2/cv/download | null | 200; same PDF bytes returned | 200 | **PASS** | {"bytes":736,"pdfHeader":"%PDF-","matchesFixture":true} |
| 32 | Applications / employer | PATCH /api/applications/2/status | {"status":"ACCEPTED"} | 200; accept application | 200 | **PASS** | {"message":"Đã chấp nhận hồ sơ ứng tuyển"} |
| 33 | Applications / student | GET /api/applications/my | null | 200; status persists | 200 | **PASS** | {"data":[{"id":2,"cv_url":"private-cv:2b977e20-4055-4e86-9698-775d4ac325fa.pdf","status":"ACCEPTED","company_name":"Demo Technology Smoke"},{"id":1,"cv_url":"https://example.com/demo-cv.pdf","status":"PENDING","company_name":"Demo Technology Smoke"}]} |
| 34 | Applications / student | POST /api/applications | {"job_id":2} | 409; duplicate rejected | 409 | **PASS** | {"message":"Bạn đã ứng tuyển công việc này"} |
| 35 | Applications / student | POST /api/applications | {"job_id":4,"cover_letter":"Rejected job guard probe"} | 400; cannot apply to rejected job | 201 | **FAIL** | {"message":"Ứng tuyển thành công","applicationId":3} |
| 36 | CV builder / student | POST /api/cvs | {"title":"Smoke CV","template":"modern","personal_info":{"full_name":"Smoke Student","email":"smoke@example.invalid"},"education":[],"experience":[],"skills":["JavaScript"],"projects":[],"certifications":[]} | 201; create CV | 201 | **PASS** | {"message":"Tạo CV thành công","data":{"id":2}} |
| 37 | CV builder / student | GET /api/cvs | null | 200; list includes created CV | 200 | **PASS** | {"data":[{"id":2,"title":"Smoke CV","personal_info":{"email":"smoke@example.invalid","full_name":"Smoke Student"},"skills":["JavaScript"]},{"id":1,"title":"Demo CV","personal_info":{"full_name":"Demo Student"},"skills":["JavaScript","React"]}]} |
| 38 | CV builder / student | PUT /api/cvs/2 | {"title":"Smoke CV updated","template":"modern","personal_info":{"full_name":"Smoke Student","email":"smoke@example.invalid"},"education":[],"experience":[],"skills":["JavaScript","React"],"projects":[],"certifications":[]} | 200; update CV | 200 | **PASS** | {"message":"Cập nhật CV thành công"} |
| 39 | CV builder / student | GET /api/cvs/2 | null | 200; JSON/title update persists | 200 | **PASS** | {"data":{"id":2,"title":"Smoke CV updated","personal_info":{"email":"smoke@example.invalid","full_name":"Smoke Student"},"skills":["JavaScript","React"]}} |
| 40 | CV builder / student | DELETE /api/cvs/2 | null | 200; delete CV | 200 | **PASS** | {"message":"Xóa CV thành công"} |
| 41 | CV builder / student | GET /api/cvs/2 | null | 404; deleted CV absent | 404 | **PASS** | {"message":"Không tìm thấy CV"} |
| 42 | CV parse / student | POST /api/cvs/parse | {"file":{"filename":"smoke.pdf","type":"application/pdf","size":736}} | 200; extract synthetic email | 200 | **PASS** | {"message":"Đã trích xuất văn bản CV. Vui lòng kiểm tra trước khi lưu.","data":{"title":"CV Smoke Student","personal_info":{"full_name":"Smoke Student","email":"smoke@example.invalid","phone":"0900000000"},"skills":["JavaScript","React","- 1 of 1 --"]},"warnings":["Học vấn, kinh nghiệm và dự án cần nhập hoặc xác nhận thủ công."]} |
| 43 | CV parse / student | POST /api/cvs/parse | {"file":{"filename":"smoke.docx","type":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","size":1300}} | 200; extract synthetic email | 200 | **PASS** | {"message":"Đã trích xuất văn bản CV. Vui lòng kiểm tra trước khi lưu.","data":{"title":"CV Smoke Student","personal_info":{"full_name":"Smoke Student","email":"smoke@example.invalid","phone":"0900000000"},"skills":["JavaScript","React"]},"warnings":["Học vấn, kinh nghiệm và dự án cần nhập hoặc xác nhận thủ công."]} |
| 44 | CV parse / student | POST /api/cvs/parse | {"file":{"filename":"smoke.pdf","type":"application/octet-stream","size":736}} | 200; extract synthetic email | 400 | **FAIL** | {"message":"Tệp không đúng định dạng PDF/DOCX."} |
| 45 | Chat / student | POST /api/chat/conversations | {"employerId":1} | 200; create/upsert conversation using profile id | 200 | **PASS** | {"message":"Cuộc trò chuyện đã sẵn sàng","conversationId":1} |
| 46 | Chat / student | POST /api/chat/conversations | {"employerId":1} | 200; upsert returns same id | 200 | **PASS** | {"message":"Cuộc trò chuyện đã sẵn sàng","conversationId":1} |
| 47 | Chat / student | GET /api/chat/conversations | null | 200; inbox includes conversation | 200 | **PASS** | {"message":"Lấy danh sách cuộc trò chuyện thành công","conversations":[{"id":1}]} |
| 48 | Chat / employer | GET /api/chat/conversations | null | 200; inbox includes conversation | 200 | **PASS** | {"message":"Lấy danh sách cuộc trò chuyện thành công","conversations":[{"id":1}]} |
| 49 | Chat / student | POST /api/chat/conversations/1/messages | {"content":"Smoke REST message"} | 201; REST send | 201 | **PASS** | {"message":"Gửi tin nhắn thành công","data":{"id":1,"conversation_id":1,"sender_id":1,"content":"Smoke REST message"}} |
| 50 | Chat / employer | GET /api/chat/conversations/1/messages | null | 200; REST message persisted | 200 | **PASS** | {"message":"Lấy lịch sử tin nhắn thành công","conversationId":1,"messages":[{"id":1,"conversation_id":1,"sender_id":1,"content":"Smoke REST message"}]} |
| 51 | Socket.IO / student+employer | EVENT join_conversation | {"conversationId":1} | both joined_conversation | event | **PASS** | {"bothJoined":true} |
| 52 | Socket.IO / student | EVENT send_message | {"conversationId":1,"content":"Smoke socket message"} | success ack plus employer receive_message same id | event | **PASS** | {"ack":{"success":true,"message":{"id":2,"conversation_id":1,"sender_id":1,"content":"Smoke socket message"}},"delivery":{"id":2,"conversation_id":1,"sender_id":1,"content":"Smoke socket message"}} |
| 53 | Socket.IO / employer | GET /api/chat/conversations/1/messages | null | 200; socket message persists in REST history | 200 | **PASS** | {"message":"Lấy lịch sử tin nhắn thành công","conversationId":1,"messages":[{"id":1,"conversation_id":1,"sender_id":1,"content":"Smoke REST message"},{"id":2,"conversation_id":1,"sender_id":1,"content":"Smoke socket message"}]} |
| 54 | OTP / public | POST /api/auth/register | {"email":"smoke-registration@example.invalid","password":"[redacted]","role":"STUDENT","full_name":"Smoke Registration"} | 400; direct register requires OTP | 400 | **PASS** | {"message":"Đăng ký cần xác minh OTP. Gọi POST /api/auth/register/request-otp trước."} |
| 55 | OTP / public | POST /api/auth/register/request-otp | {"email":"smoke-registration@example.invalid","password":"[redacted]","role":"STUDENT","full_name":"Smoke Registration"} | 200; OTP delivered (requires configured SMTP) | 500 | **BLOCKED** | {"message":"Không thể gửi OTP. Kiểm tra cấu hình SMTP."} |
| 56 | OTP / public | POST /api/auth/register/verify-otp | {"email":"smoke-registration@example.invalid","otp":"[unavailable]"} | 201 user registration | not sent | **BLOCKED** | {"reason":"OTP delivery blocked by unset SMTP; no bypass or fabricated OTP"} |
