# Local dev tooling image for Expo + Jest
FROM node:20-bullseye

# Install system dependencies commonly needed by React Native / Expo tooling
RUN apt-get update && apt-get install -y \
  git \
  python3 \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# Enable corepack (manages yarn & pnpm)
RUN corepack enable

# App workspace
WORKDIR /app

# Install dependencies using Yarn when possible, otherwise fall back to npm
# Copy only manifest files first to leverage Docker layer caching
COPY package.json yarn.lock* package-lock.json* ./

RUN if [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copy the rest of the project
COPY . .

# Expose Metro bundler port and Expo Go port
EXPOSE 8081 19000

# Default command: start Expo dev server
# - Run tests with: `docker run --rm -it <image> npm test`
CMD ["npm", "start"]
