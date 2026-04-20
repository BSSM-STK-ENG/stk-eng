FROM ghcr.io/nodejs/node:20-alpine AS builder

WORKDIR /app

# Copy only package.json (not lock file) so npm resolves platform-native deps fresh
COPY package.json ./
RUN npm install --legacy-peer-deps

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

FROM ghcr.io/nginxinc/nginx:alpine
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
