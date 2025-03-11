# Use Node.js as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the code
COPY . .

# Build the application and ignore ESLint errors
# RUN yarn build --no-lint

# Expose the port the app will run on
EXPOSE 3000

# Command to run the app
CMD ["yarn", "dev", "--hostname", "0.0.0.0"]