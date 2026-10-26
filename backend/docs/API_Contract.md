# StudentJob Marketplace — API Contract

**Base URL:** `http://localhost:5000`

**Content-Type:** `application/json`

## 1. Authentication APIs

### 1.1. Register

- **Method:** POST
- **Endpoint:** `/api/auth/register`
- **Authentication:** Not required

Request body — Student:

```json
{
  "email": "student@example.com",
  "password": "Password123",
  "role": "STUDENT",
  "full_name": "Nguyen Van A"
}
```

Request body — Employer:

```json
{
  "email": "employer@example.com",
  "password": "Password123",
  "role": "EMPLOYER",
  "company_name": "ABC Company"
}
```

Expected status: `201 Created` on successful registration.

### 1.2. Login

- **Method:** POST
- **Endpoint:** `/api/auth/login`
- **Authentication:** Not required

Request body:

```json
{
  "email": "student@example.com",
  "password": "Password123"
}
```

Expected status: `200 OK` on successful login.

The response returns the authentication information defined by the current backend, including the JWT token if that is the implemented response format.

### 1.3. Get current user

- **Method:** GET
- **Endpoint:** `/api/auth/me`
- **Authentication:** Required

Header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Expected status: `200 OK` when the token is valid.

## 2. Jobs APIs

### 2.1. Get job list

- **Method:** GET
- **Endpoint:** `/api/jobs`
- **Authentication:** Check current route middleware

No request body required.

Expected status: `200 OK`.

### 2.2. Get job details

- **Method:** GET
- **Endpoint:** `/api/jobs/:id`
- **Authentication:** Check current route middleware

Example: `/api/jobs/1`

Expected status: `200 OK` if found; `404 Not Found` if the job does not exist.

### 2.3. Create job

- **Method:** POST
- **Endpoint:** `/api/jobs`
- **Authentication:** Employer

Header:

```http
Authorization: Bearer <EMPLOYER_JWT_TOKEN>
```

Request body:

```json
{
  "title": "Part-time Sales Assistant",
  "description": "Support daily sales activities",
  "location": "Ho Chi Minh City",
  "salary_min": 25000,
  "salary_max": 35000,
  "job_type": "PART_TIME",
  "deadline": "2026-12-31",
  "status": "OPEN"
}
```

Expected status: `201 Created` on success, subject to the current controller's response format.

Valid job types: `PART_TIME`, `FULL_TIME`, `FREELANCE`.

Valid job statuses: `OPEN`, `CLOSED`.

### 2.4. Update job

- **Method:** PUT
- **Endpoint:** `/api/jobs/:id`
- **Authentication:** Employer who owns the job

Header:

```http
Authorization: Bearer <EMPLOYER_JWT_TOKEN>
```

The request body contains the job fields supported by the update controller.

Expected outcomes:
- `200 OK`: Update successful.
- `403 Forbidden`: Employer does not own the job.
- `404 Not Found`: Job does not exist, if handled by the controller.

## 3. Applications APIs

### 3.1. Apply for a job

- **Method:** POST
- **Endpoint:** `/api/applications`
- **Authentication:** Student

Request body:

```json
{
  "job_id": 1,
  "cv_url": "https://example.com/cv.pdf",
  "cover_letter": "I am interested in this position."
}
```

Expected outcomes:
- `201 Created`: Application created.
- `400 Bad Request`: Invalid request data.
- `404 Not Found`: Job not found.
- `409 Conflict`: Duplicate application or job cannot be applied to, as handled by the controller.

### 3.2. Get my applications

- **Method:** GET
- **Endpoint:** `/api/applications/my`
- **Authentication:** Student

No request body required.

Expected status: `200 OK`.

Returns the authenticated student's applications.

### 3.3. Get applications for a job

- **Method:** GET
- **Endpoint:** `/api/applications/job/:jobId`
- **Authentication:** Employer who owns the job

Example: `/api/applications/job/1`

Expected status: `200 OK` on success.

Returns the applications associated with the specified job.

### 3.4. Update application status

- **Method:** PATCH
- **Endpoint:** `/api/applications/:id/status`
- **Authentication:** Employer authorized to manage the job

Request body:

```json
{
  "status": "ACCEPTED"
}
```

Allowed status values for this operation: `ACCEPTED`, `REJECTED`.

Expected outcomes:
- `200 OK`: Status updated.
- `400 Bad Request`: Invalid status or invalid state transition.
- `403 Forbidden`: Insufficient permission.
- `404 Not Found`: Application not found, if handled by the controller.

## 4. Common HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Request successful |
| `201` | Resource created |
| `400` | Invalid request |
| `401` | Authentication required or token invalid |
| `403` | Insufficient permission |
| `404` | Resource not found |
| `409` | Conflict, such as duplicate application |
| `500` | Internal server error |

## 5. Authorization rules

- Public users can register and log in.
- Authenticated users can access their own account information.
- Students can apply for jobs and view their own applications.
- Employers can create and update their own job listings.
- Employers can view applications for jobs they own and process application statuses.
- Users must not access or modify resources outside their authorization scope.
