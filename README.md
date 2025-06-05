# Squidgy Project Deployment Guide For development

This guide provides instructions for deploying the Squidgy application, which consists of a frontend and two backend options (local testing and hosting).

## Project Structure

```
BoilerPlateV1\
├── Code\
│   ├── squidgy-backend\          # Backend for local testing
│   ├── squidgy-backend_host\     # Backend for deployment
│   └── squidgy-frontend\         # Frontend (common for both backends)
```

## Deployment Methods

There are two ways to deploy this application:

1. **Manual Deployment**: Follow the step-by-step instructions below
2. **Docker Deployment**: Use the Docker configuration provided in the "Docker Deployment Instructions" document

## Docker Deployment

For Docker-based deployment, follow these steps:

1. Create a Dockerfile in the backend_host directory:
```dockerfile
# Choose our version of Python
FROM python:3.12

# Set up a working directory
WORKDIR /code

# Copy just the requirements into the working directory so it gets cached by itself
COPY ./requirements.txt /code/requirements.txt

# Install the dependencies from the requirements file
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the vector_store.py file to the root code directory
COPY ./app/vector_store.py /code/vector_store.py
COPY ./app/roles_config.py /code/roles_config.py

# Copy the entire app directory with all files
COPY ./app /code/app

# Copy GHL directory 
COPY ./GHL /code/GHL

# Copy conversation_templates.xlsx to the code directory
COPY ./app/conversation_templates.xlsx /code/conversation_templates.xlsx

COPY ./.env /code/.env

# Tell uvicorn to start spin up our code, which will be running inside the container now
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]
```

2. Create a Dockerfile in the frontend directory:
```dockerfile
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
```

3. Create a docker-compose.yml file in the root directory:
```yaml
version: '3'
services:
  backend:
    build:
      context: ./Code/squidgy-backend_host
    ports:
      - "80:80"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
  
  frontend:
    build:
      context: ./Code/squidgy-frontend
    depends_on:
      - backend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE=backend:80
```

4. Run the deployment:
```bash
docker-compose up -d
```

**Note**: Make sure all environment variables required by both services are properly configured. The backend exposes port 80 in this configuration, so the frontend's API base should point to `backend:80` instead of `127.0.0.1:8080`.

## Deployment Order

**Important**: Always deploy the backend first, followed by the frontend. This ensures proper WebSocket connection establishment.

## Backend Deployment (squidgy-backend_host)

1. Navigate to the backend_host directory:
   ```
   cd Code\squidgy-backend_host
   ```

2. Install required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Check the `.env` file in the backend_host folder
   - Contact Soma for required environment variables if needed

4. **Critical Step**: Update all occurrences of `127.0.0.1:8080` in the code to your actual deployment endpoint URL
   - This includes file paths, configuration files, and connection strings
   - This step ensures the backend can be properly accessed by the frontend

5. Start the backend server:
   ```
   python main.py
   ```

6. Note the URL where your backend is running, as you'll need it for frontend configuration

## Frontend Deployment (squidgy-frontend)

1. Navigate to the frontend directory:
   ```
   cd Code\squidgy-frontend
   ```

2. Install required dependencies:
   ```
   yarn install
   ```

3. Configure the API endpoint:
   - Open the frontend configuration or `.env` file
   - Update the API base URL to point to your deployed backend:
     ```
     # Located in .env or similar configuration file
     NEXT_PUBLIC_API_BASE=your-backend-endpoint-url
     ```
   - This replaces the default `127.0.0.1:8080` with your actual backend URL

4. Run the frontend application:
   ```
   yarn dev
   ```
   
   The frontend will be accessible at `http://127.0.0.1:3000`


## WebSocket Implementation Notes

- This application uses WebSockets for real-time communication
- Ensure that any firewalls or network configurations allow WebSocket connections
- The backend must be running and accessible before the frontend is started
- Test the WebSocket connection after deployment to ensure proper functionality

## Troubleshooting

If you encounter connection issues:

1. Verify the backend is running and accessible
2. Check that all `127.0.0.1:8080` references were updated to the correct deployment URL
3. Confirm environment variables are properly set in both backend and frontend
4. Ensure WebSocket ports are not blocked by firewalls or network policies
5. update backend url for websocket connection in Vercel environment variables (NEXT_PUBLIC_API_BASE)

## Contact Information

For additional deployment assistance or to obtain required environment variables, please contact Soma.