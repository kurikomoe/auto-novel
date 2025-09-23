FROM node:21-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /web
COPY package.json pnpm-lock.yaml .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
COPY . .
RUN pnpm run build

FROM caddy:2.7.4
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /web/dist /dist
