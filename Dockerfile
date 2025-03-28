# Stage 1: Build Stage
FROM node:16 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Use npx to run Babel
RUN npx babel src --out-dir dist

# Build the application (assuming it's a TypeScript project)
RUN npm run build

# Stage 2: Production Stage
FROM node:16-slim AS production

# Set the working directory inside the container
WORKDIR /app

# Copy only the built application and necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production

# Expose the port the application runs on
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/PrepareGeoJSON.js"]