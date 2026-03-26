# Use the full Node.js image (more robust for native modules like sqlite3)
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Ensure data directory exists
RUN mkdir -p /data

# Expose the port (Render provides this via PORT env)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
