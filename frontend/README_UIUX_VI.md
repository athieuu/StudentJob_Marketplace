# StudentJob Marketplace — Bản nâng cấp UI/UX tiếng Việt

## Đã bổ sung
- Trang `/companies`: khám phá các công ty dựa trên tin tuyển dụng đã được duyệt, tìm theo tên và xem các công việc đang mở.
- Trang `/student/saved`: danh sách việc làm đã lưu. Nút đánh dấu có trên thẻ việc làm và trang chi tiết. Dữ liệu lưu trong `localStorage` theo ID tài khoản, trên từng trình duyệt (chưa đồng bộ server).
- Trang `/student/ai-cv`: tải CV PDF/DOCX (tối đa 5 MB), gọi API `/api/cvs/parse` hiện có và hiển thị thông tin trích xuất/cảnh báo. Yêu cầu backend và đăng nhập hợp lệ.
- Việt hóa phần lớn giao diện `src/App.tsx`, gồm trang công khai, điều hướng, bảng quản trị, biểu mẫu và thông báo; giữ nguyên các khóa kỹ thuật, dữ liệu API và tên riêng.
- CSS responsive cho các giao diện mới.

## Giữ nguyên
- Các route và luồng xác thực, phân quyền, ứng tuyển, chat realtime, tạo CV, quản lý tuyển dụng và quản trị đang có.
- Cấu hình backend hiện có; không chỉnh sửa hoặc thay đổi schema/API.

## Chạy trên Windows
```powershell
cd frontend
npm install
npm run dev
```
Sau đó mở địa chỉ Vite hiển thị. Kiểm tra `VITE_API_BASE_URL` theo backend thực tế.

## Kiểm thử
- Đã chạy kiểm tra TypeScript bằng `tsc -b`: thành công.
- Chưa chạy được Vite build/browser trong môi trường xử lý do các gói binary Rollup trong ZIP được cài cho Windows, không tương thích Linux. Hãy chạy `npm install` trên Windows rồi `npm run build` để xác nhận build sản phẩm.

## Lưu ý
- Danh sách công ty dùng dữ liệu công việc thực từ store/API, không dùng dữ liệu giả của bản prototype.
- Phân tích CV chỉ trích xuất dữ liệu trả về từ backend, không tự sinh điểm đánh giá AI.
- Nội dung công việc, tên công ty và dữ liệu do backend cung cấp có thể còn tiếng Anh; để Việt hóa các dữ liệu đó cần cập nhật nguồn dữ liệu/backend.
