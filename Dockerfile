# Dockerfile
#
# Multi-stage build - 2 giai đoạn tách biệt (giống hệt backend):
# 1. "builder": cài ĐẦY ĐỦ package (gồm devDependencies) để biên dịch
#    TypeScript + bundle bằng Vite.
# 2. "nginx": chỉ copy output ĐÃ BUILD (dist/) vào image nginx - image
#    cuối cùng KHÔNG chứa node_modules, mã nguồn .ts hay devDependencies.
#
# Lưu ý quan trọng (giống .env của BE): VITE_API_URL là "build-time env" -
# Vite chỉ "nhúng" (inline) giá trị env vào bundle lúc BUILD, không đọc lúc
# runtime. Vì vậy nó được truyền qua ARG/ENV ở stage builder (docker compose
# / CI sẽ truyền), KHÔNG chịu ném vào image dạng secret - nó chỉ là URL công
# khai của API, khác hẳn secret thật ở backend.

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json trước, cài dependency TRƯỚC khi copy code - tận dụng
# Docker layer caching (giống backend): sửa 1 dòng component không phải chạy
# lại cả npm ci.
COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---------- Stage 2: nginx ----------
FROM nginx:1.27-alpine

# Copy bundle đã build sang thư mục gốc web của nginx.
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy cấu hình nginx tuỳ chỉnh (SPA fallback + gzip).
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check: nginx image alpine có sẵn wget (busybox), trả 0 nếu trang
# chủ trả về HTTP 200 (giống HEALTHCHECK backend dùng /health).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:${PORT:-80}/ >/dev/null || exit 1

# Render (và nhiều PaaS) inject PORT env (10000) và expect container listen đúng port đó.
# Local docker compose chạy 80, Render chạy 10000 — dùng sh để thay thế port động lúc runtime.
CMD ["sh", "-c", "PORT=${PORT:-80} && sed -i \"s/listen 80;/listen $PORT;/g\" /etc/nginx/conf.d/default.conf && sed -i \"s/listen \\[::\\]:80;/listen [::]:$PORT;/g\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]