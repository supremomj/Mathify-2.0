# Use official Node.js image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create data directory for SQLite persistence
RUN mkdir -p /data && chown node:node /data

# Expose the port (Railway/Render provide this via PORT env)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run as non-privileged user
USER node

# Start the application
CMD ["npm", "start"]
