FROM node:20-slim
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
