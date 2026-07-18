FROM node:20-bullseye-slim AS base

# yt-dlp needs Python + ffmpeg for merging/encoding formats
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      ffmpeg \
      ca-certificates \
      curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp as a standalone binary (kept up to date independent of pip)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev=false

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

RUN mkdir -p /app/data/auth /app/data/downloads /app/logs

ENV NODE_ENV=production
ENV YTDLP_PATH=/usr/local/bin/yt-dlp
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
