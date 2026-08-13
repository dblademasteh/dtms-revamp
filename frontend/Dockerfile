FROM node:20-alpine AS build

ARG VITE_API_URL=/api
ARG VITE_APP_NAME=DTS
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=
ARG VITE_REVERB_SCHEME=http
ARG VITE_REVERB_APP_KEY=dts-reverb-key

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN VITE_API_URL=$VITE_API_URL VITE_REVERB_HOST=$VITE_REVERB_HOST VITE_REVERB_PORT=$VITE_REVERB_PORT VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY VITE_APP_NAME=$VITE_APP_NAME npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]