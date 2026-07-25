FROM node:20-alpine AS build

ARG VITE_API_URL=https://your-backend-domain.coolify.app
ARG VITE_APP_NAME=DTS

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN VITE_API_URL=$VITE_API_URL VITE_APP_NAME=$VITE_APP_NAME npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]