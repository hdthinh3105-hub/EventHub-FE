# EventHub Frontend — React + Vite

Giao diện cho nền tảng đặt vé EventHub, kết nối tới `eventhub-backend` qua REST + Socket.IO. Demo: https://eventhub-fe.onrender.com — API: https://eventhub-1lf8.onrender.com

---

## 1. Tài khoản demo (dùng ngay sau khi BE seed)

Mật khẩu chung: `Password123!`

| Email | Role | Quyền |
|---|---|---|
| `admin@eventhub.vn` | ADMIN | Quản lý user/role, category, venue — xem `/admin` |
| `organizer@eventhub.vn` | ORGANIZER | Tạo event, vé, gán staff, check-in — xem `/organizer` |
| `staff@eventhub.vn` | STAFF | Được gán vào event mới quét QR được |
| `customer@eventhub.vn` | CUSTOMER | Giữ chỗ 10p → checkout → nhận vé QR ở `/checkout/success` |

---

## 2. Chạy nhanh 30 giây bằng Docker (không cần Node local)

```bash
# 1. Clone (bỏ qua nếu đã tải folder EventHub này thì dùng luôn EventHub/eventhub-backend và EventHub/eventhub-frontend)
git clone https://github.com/hdthinh3105-hub/EventHub.git          # BE
git clone https://github.com/hdthinh3105-hub/EventHub-FE.git       # FE

# 2. Backend phải chạy trước (có Postgres/Redis/RabbitMQ)
cd EventHub
cp .env.example .env   # điền 6 dòng JWT_*/GMAIL_*/CLOUDINARY_* (xem mục 5 BE)
docker compose up --build -d   # BE: http://localhost:4000

# 3. Frontend — 1 service nginx riêng
cd ../EventHub-FE
docker compose up --build -d   # FE: http://localhost:8080
# Mở http://localhost:8080 — F5 ở /events/123 không 404 (SPA fallback)
# Nếu dùng folder EventHub có sẵn: cd EventHub/eventhub-frontend thay vì ../EventHub-FE
```

Đổi API URL khi build:
```bash
docker compose build --build-arg VITE_API_URL=https://eventhub-1lf8.onrender.com
docker compose up -d
```

Dừng: `docker compose down`

---

## 3. Chạy thủ công (npm) — dành cho dev

```bash
# 1. Clone (bỏ qua nếu đã có folder EventHub)
git clone https://github.com/hdthinh3105-hub/EventHub.git       # BE
git clone https://github.com/hdthinh3105-hub/EventHub-FE.git    # FE

# 2. Backend
cd EventHub
npm ci && cp .env.example .env  # điền .env rồi:
npx prisma generate && npx prisma migrate dev && npx prisma db seed
npm run dev   # http://localhost:4000

# 3. Frontend (terminal khác)
cd ../EventHub-FE
npm ci
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev            # http://localhost:5173
# Nếu dùng folder EventHub có sẵn: cd EventHub/eventhub-frontend
```

---

## 4. Kiểm tra đã chạy

- Mở http://localhost:8080 (Docker) hoặc http://localhost:5173 (npm) → thấy danh sách sự kiện
- Chi tiết event → số vé "Còn lại" cập nhật realtime khi có người mua (Socket.IO)
- Đăng nhập `customer@eventhub.vn` → chọn vé → Giữ chỗ đếm ngược 10p → Thanh toán → thấy QR

---

## 5. Biến môi trường

| Biến | Mô tả |
|---|---|
| `VITE_API_URL` | URL backend — **build-time**, đổi phải build lại. VD `http://localhost:4000` hoặc `https://eventhub-1lf8.onrender.com` |

Xem `src/config` không có — chỉ 1 biến duy nhất.

---

## 6. Tính năng

- **Khách:** xem event (search Full-Text, filter category, phân trang), chi tiết + chọn vé realtime, giữ chỗ → checkout → vé QR
- **Organizer/Admin:** Dashboard "Sự kiện của tôi" realtime toast, CRUD event, upload ảnh Cloudinary, chuyển DRAFT→PUBLISHED, CRUD ticket, gán staff (dropdown `GET /api/users?role=STAFF` cho cả ADMIN và ORGANIZER), check-in QR + luồng realtime, export/import Excel, thông báo realtime
- **Admin:** quản lý user/role, category, venue

---

## 7. Testing

```bash
npm test          # Vitest run, 14 tests
npm run test:watch
```

- `tests/api-client.test.ts` — gắn Bearer, single-flight refresh (2 request 401 chỉ refresh 1 lần), retry, clear session
- `tests/protected-page.test.tsx` — chưa login → /login, sai role → /, đúng → render
- `tests/home-page.test.tsx` — render list, dropdown, phân trang, lỗi

---

## 8. Docker

Multi-stage: `builder` (npm ci + Vite build) → `nginx:1.27-alpine` (copy `dist` + `nginx.conf` SPA `try_files` + gzip). Healthcheck `wget http://127.0.0.1:$PORT/`.

---

## 9. CI/CD & Deploy

`.github/workflows/ci.yml` chạy khi push/PR `main`: `npm ci` → `typecheck` → `test` → `build` (kèm `VITE_API_URL` từ `vars.VITE_API_URL`). Push thẳng `main` → `curl POST $RENDER_DEPLOY_HOOK_URL` deploy Render.

**Deploy Render (Static Site):** Build `npm ci && npm run build`, Publish `dist`, Env `VITE_API_URL` = URL BE thật. Xong cập nhật BE `FRONTEND_URL` + `ALLOWED_ORIGINS` = URL FE.

---

## 10. Realtime & Routes

`src/lib/socket.ts` `useEventSocket` — gửi `accessToken` nếu có (anonymous vẫn xem được vé), join `event:<id>`, BE tự join `user:<id>`.

| Sự kiện | Trang | Hành động |
|---|---|---|
| `ticket_sold` | EventDetail, EventManage, OrganizerDashboard | Giảm "Còn lại" + toast |
| `hold_released` | EventDetail | Hoàn vé hết hạn |
| `checkin_processed` | EventManage tab Check-in | Thêm luồng check-in |
| `notification` | EventManage, OrganizerDashboard | Push thông báo |

| Đường dẫn | Quyền |
|---|---|
| `/` | Public |
| `/events/:id` | Public |
| `/checkout/success` | Customer (kèm `?orderId=` để F5 vẫn lấy lại được vé) |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Public |
| `/organizer`, `/organizer/events/new`, `/organizer/events/:id` | ORGANIZER/ADMIN |
| `/admin` | ADMIN |
