# EventHub Frontend

Frontend (React + Vite + TypeScript) cho nền tảng đặt vé & quản lý sự kiện EventHub, kết nối trực tiếp với API trong [`../eventhub-backend`](../eventhub-backend).

## Tính năng

### Khách hàng
- Xem danh sách sự kiện (search bằng Full-Text Search, lọc theo danh mục, phân trang)
- Xem chi tiết sự kiện + chọn loại vé, số lượng — **số vé "Còn lại" cập nhật realtime qua Socket.IO** (khi có người mua, khi hold hết hạn số vé được hoàn về quỹ vé)
- Giữ chỗ (đếm ngược 10 phút) → Thanh toán → xem vé điện tử kèm **mã QR thật** ngay trên màn hình
- Đăng ký / đăng nhập / quên mật khẩu / xác thực email (link trong email đúng route FE)

### Nhà tổ chức (Organizer) / Admin
- Dashboard "Sự kiện của tôi" — realtime qua Socket.IO: toast ngay khi có vé bán, push thông báo cá nhân (room `user:<id>`)
- Tạo / sửa sự kiện, upload ảnh bìa, chuyển trạng thái DRAFT → PUBLISHED → CANCELLED/COMPLETED
- Quản lý loại vé (CRUD, chặn giảm tổng số vé dưới số đã bán)
- Gán/bỏ gán nhân viên STAFF check-in
- Check-in tại cổng bằng mã QR (phân quyền 3 tầng phía server) + **luồng check-in realtime**: mọi người đang mở trang quản lý thấy khách vừa vào cổng ngay lập tức
- Xuất báo cáo doanh thu Excel, import vé mời hàng loạt từ file `.xlsx`
- Thông báo realtime (đẩy thẳng vào danh sách khi có vé mới bán, không cần F5) + mark read hàng loạt

### Quản trị viên (Admin)
- Quản lý người dùng & gán role (ADMIN/ORGANIZER/STAFF/CUSTOMER)
- Quản lý danh mục & địa điểm (CRUD)

## Chạy local

```bash
npm install
cp .env.example .env   # VITE_API_URL mặc định http://localhost:4000
npm run dev            # http://localhost:5173
```

Để chạy đối với API local: vào `../eventhub-backend` chạy `npm run dev` (server chạy ở `http://localhost:4000`).

## Test

```bash
npm test          # chạy 1 lần (Vitest + Testing Library, môi trường jsdom)
npm run test:watch # watch mode khi phát triển
```

Test tập trung vào phần quan trọng nhất (giống tầng middleware của backend):
- `tests/api-client.test.ts` — API client: gắn `Authorization: Bearer`, cơ chế **refresh token single-flight** (2 request song song cùng 401 chỉ gọi refresh 1 lần), retry sau 401, xoá session + bắn sự kiện `eh:logout` khi refresh thất bại, lỗi mạng.
- `tests/protected-page.test.tsx` — phân quyền giao diện: chưa đăng nhập → `/login`, sai role → `/`, đúng role → render nội dung.
- `tests/home-page.test.tsx` — render danh sách sự kiện, dropdown danh mục, phân trang, hiển thị lỗi (API được mock).

## Docker (chạy local bằng container)

```bash
docker compose up --build   # truy cập http://localhost:8080
```

Multi-stage build: stage `builder` bundle bằng Vite → stage `nginx` chỉ chứa `dist/` + nginx.conf (SPA fallback `try_files` + gzip). `VITE_API_URL` là **build-time env** — truyền qua `ARG` khi build (mặc định `http://localhost:4000`):

```bash
docker build --build-arg VITE_API_URL=https://eventhub-1lf8.onrender.com -t eventhub-frontend .
```

## CI/CD (GitHub Actions, giống hệt backend)

`.github/workflows/ci.yml` — chạy khi push/PR vào `main`:
1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build` (kèm `VITE_API_URL`, dùng repo variable `VITE_API_URL`, fallback `http://localhost:4000`)
5. **CD**: nếu build-test pass và push thẳng vào `main` → gọi Render Deploy Hook (secret `RENDER_DEPLOY_HOOK_URL`, tạo trên trang Web Service/Static Site của Render).

## Deploy lên Render

1. Tạo **Static Site** trên Render, build command: `npm install && npm run build`, publish directory: `dist`.
2. Set env `VITE_API_URL` = URL thật của backend.
3. (Cách 2) Dùng `RENDER_DEPLOY_HOOK_URL` + workflow ở mục CI/CD → mỗi lần push `main` là Render tự build mới.
4. Trên **backend**, update:
   - `FRONTEND_URL` = URL của FE deploy (để link xác thực email / reset mật khẩu trong email đúng địa chỉ).
   - `ALLOWED_ORIGINS` = URL FE (CORS chỉ cho phép domain này, không để `*`).

Tài khoản seed (xem `../eventhub-backend/prisma/seed.ts`, mật khẩu `Password123!`):
- `admin@eventhub.vn` — Quản trị
- `organizer@eventhub.vn` — Nhà tổ chức
- `staff@eventhub.vn` — Nhân viên (gán vào event mới check-in được)
- `customer@eventhub.vn` — Khách hàng (mua vé)

## Biến môi trường

| Biến | Mô tả |
|---|---|
| `VITE_API_URL` | URL backend, VD `http://localhost:4000` hoặc `https://eventhub-1lf8.onrender.com` |

## Ghi chú

- `GET /api/events?organizerId=...` hỗ trợ filter server-side cho Organizer Dashboard (không còn lọc client).
- `GET /api/users?role=STAFF` cho cả ADMIN và ORGANIZER (ORGANIZER chỉ được xem STAFF) — StaffTab dùng dropdown cho cả hai, không cần nhập tay `userId`.
- `GET /api/orders/:id` hỗ trợ `CheckoutSuccessPage` fallback khi F5 (kèm `?orderId=`).
- `GET /api/users/:id` cho ADMIN/ORGANIZER tra cứu user.
- `ErrorBoundary` + `React.lazy` code splitting cho tất cả routes.
- Socket.IO: trang công khai (chi tiết sự kiện) kết nối **anonymous** để nhận số vé còn lại realtime; khi có `accessToken` sẽ gửi kèm để nhận cả thông báo cá nhân (room `user:<id>`). Khi token hết hạn cần refresh + đăng nhập lại để nhận tiếp thông báo cá nhân (số vé công khai vẫn hoạt động).

## Realtime (Socket.IO)

Hook `useEventSocket` (`src/lib/socket.ts`) quản lý 1 kết nối WebSocket duy nhất, tự động:
- Gửi kèm `accessToken` nếu có (đăng nhập) — **không bắt buộc** cho các trang công khai (anonymous).
- Join tất cả room `event:<id>` được yêu cầu; BE tự join room `user:<id>` cho socket đã xác thực.

**Các sự kiện FE đang lắng nghe:**
| Sự kiện | Trang sử dụng | Hành động |
|---|---|---|
| `ticket_sold` | `EventDetailPage`, `EventManagePage`, `OrganizerDashboard` | Giảm số vé còn lại / cập nhật `soldQuantity` + toast |
| `hold_released` | `EventDetailPage` | Hoàn trả số vé bị giữ hết hạn vào "Còn lại" |
| `checkin_processed` | `EventManagePage` (tab Check-in) | Thêm khách vào luồng check-in realtime + toast |
| `notification` | `EventManagePage`, `OrganizerDashboard` | Push thông báo mới vào danh sách + toast (không F5) |

## Routes

| Đường dẫn | Quyền |
|---|---|
| `/` | Public — danh sách sự kiện |
| `/events/:id` | Public — chi tiết + mua vé |
| `/checkout/success` | Đã đăng nhập — hiện vé QR sau thanh toán |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Public |
| `/organizer`, `/organizer/events/new`, `/organizer/events/:id` | ORGANIZER / ADMIN |
| `/admin` | ADMIN |