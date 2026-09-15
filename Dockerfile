FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build

# Run as an unprivileged user. Without this the Node process is root, so any
# RCE through the upload path starts with root inside the container. Numeric UID
# (not the name) so the host resolves it even without /etc/passwd entry.
RUN addgroup -g 10001 app \
    && adduser -u 10001 -G app -D -s /sbin/nologin app \
    && chown -R app:app /app
USER 10001

EXPOSE 3000
CMD ["node", "build"]
