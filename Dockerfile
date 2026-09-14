# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_ASSETS_API_URL
ENV VITE_ASSETS_API_URL=$VITE_ASSETS_API_URL

ARG VITE_CDN_BASE
ENV VITE_CDN_BASE=$VITE_CDN_BASE

RUN npm run build

FROM nginx:alpine AS serve

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]