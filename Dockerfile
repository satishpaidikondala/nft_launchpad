# Build stage for contracts
FROM node:18-alpine AS contracts
WORKDIR /app
RUN apk add --no-cache curl
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npx hardhat compile

# Build stage for frontend
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
# Install dependencies including devDependencies
RUN npm install
COPY frontend/ .
