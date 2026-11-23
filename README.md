# StudentJob Marketplace

Database setup has moved to [database/README.md](database/README.md): use the
ordered MySQL 8 migrations and optional isolated demo Compose. Any legacy SQL
import instructions below are superseded; the old SQL files are DEPRECATED.

Nền tảng kết nối **sinh viên** với **nhà tuyển dụng** cho các công việc Part-time, Full-time và Freelance.

## 1. Project Overview

StudentJob Marketplace hỗ trợ:

- Sinh viên tìm kiếm và ứng tuyển việc làm.
- Nhà tuyển dụng đăng và quản lý tin tuyển dụng.
- Theo dõi trạng thái ứng tuyển.
- Quản lý thông tin sinh viên và nhà tuyển dụng.
- Cung cấp RESTful API cho Frontend.

## 2. Team Roles

| Thành viên | Vai trò |
|---|---|
| Bùi Ngọc Thiệu | Backend, API, Database |
| Anh Khoa | Frontend, UI |
| Thanh Vy | Integration, Testing |

## 3. Technologies

### Backend
- Node.js
- Express.js
- REST API
- JWT Authentication
- bcryptjs
- mysql2

### Frontend
- React
- TypeScript
- Vite
- React Router
- Tailwind CSS

### Database
- MySQL

## 4. Project Structure

```text
StudentJob_Marketplace/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── database/
│   ├── schema.sql
│   └── seed.sql
└── README.md
```

## 5. Requirements

Cần cài đặt trước:

- Node.js và npm
- MySQL Server
- MySQL Workbench
- Git

## 6. Installation & Setup

### Step 1: Clone repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd StudentJob_Marketplace
```

Thay `<YOUR_GITHUB_REPOSITORY_URL>` bằng URL repository GitHub của dự án.

### Step 2: Create MySQL database

Mở MySQL Workbench và kết nối MySQL Server.

Tạo database:

```sql
CREATE DATABASE studentjob_marketplace
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### Step 3: Import database schema

Mở file:

```text
database/schema.sql
```

Chạy toàn bộ script trong MySQL Workbench để tạo các bảng:

- users
- student_profiles
- employer_profiles
- jobs
- applications

**Lưu ý:** Chỉ chạy schema trên database mới hoặc database test. Script có thể xóa và tạo lại các bảng.

### Step 4: Import demo data

Mở file:

```text
database/seed.sql
```

Chạy toàn bộ script để tạo dữ liệu mẫu.

Demo accounts:

| Role | Email | Password |
|---|---|---|
| Student | student.demo@example.com | Student@123 |
| Employer | employer.demo@example.com | Student@123 |

### Step 5: Configure Backend

Tạo file `.env` trong thư mục `backend/` bằng cách sao chép `.env.example`.

```bash
cd backend
```

Tạo file `.env` với nội dung:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=studentjob_marketplace
JWT_SECRET=your_jwt_secret
```

Thay `your_mysql_password` bằng mật khẩu MySQL của máy đang chạy dự án.

Thay `your_jwt_secret` bằng một secret riêng.

### Step 6: Install Backend dependencies

Tại thư mục `backend/`:

```bash
npm install
```

### Step 7: Run Backend

```bash
npm run dev
```

Backend chạy tại:

```text
http://localhost:5000
```

Kiểm tra API:

```text
GET http://localhost:5000/
GET http://localhost:5000/api/health/db
```

### Step 8: Install Frontend dependencies

Mở terminal mới tại thư mục gốc dự án:

```bash
cd frontend
npm install
```

### Step 9: Run Frontend

```bash
npm run dev
```

Frontend chạy tại địa chỉ Vite hiển thị trong terminal, mặc định:

```text
http://localhost:5173
```

## 7. Run Full Project

Cần mở hai terminal:

**Terminal 1 – Backend**

```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend**

```bash
cd frontend
npm run dev
```

Đảm bảo MySQL Server đang hoạt động trước khi chạy Backend.

## 8. Authentication

Backend sử dụng:

- JWT để xác thực người dùng.
- bcryptjs để mã hóa mật khẩu.
- Role-based authorization để phân quyền.

Các role:

- STUDENT
- EMPLOYER
- ADMIN

## 9. API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/jobs` | Get job listings |
| GET | `/api/jobs/:id` | Get job details |
| POST | `/api/jobs` | Create job |
| PUT | `/api/jobs/:id` | Update job |
| `/api/applications` | Application management | Apply and manage applications |

## 10. Development Tools

- Visual Studio Code
- Git / GitHub
- MySQL Workbench
- Postman

## 11. Security Notes

- Không commit file `.env` lên GitHub.
- Không commit database dump chứa dữ liệu cá nhân.
- Sử dụng `.env.example` để cung cấp cấu hình mẫu.
- Demo accounts chỉ dùng cho mục đích phát triển và kiểm thử.

## 12. Project Status

StudentJob Marketplace is under development as a graduation project.
