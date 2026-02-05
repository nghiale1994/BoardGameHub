NOTE: AI must read docs/ai/README.md before modifying this file.

# PeerJS Configuration Setup

## Overview

This application uses PeerJS for peer-to-peer communication. The PeerJS signaling server configuration is managed through GitHub repository secrets to keep sensitive information out of the source code.

## Required GitHub Repository Secrets

You need to add the following secrets to your GitHub repository:

### `VITE_PEERJS_HOST` (Required)
- **Description**: The hostname or IP address of your PeerJS signaling server
- **Example**: `your-peerjs-server.com` or `192.168.1.100`

### `VITE_PEERJS_PORT` (Optional)
- **Description**: The port number of your PeerJS signaling server
- **Default**: `443` (for HTTPS) or `80` (for HTTP)
- **Example**: `9000`

### `VITE_PEERJS_PATH` (Optional)
- **Description**: The path where PeerJS server is mounted
- **Default**: `/peerjs`
- **Example**: `/peerjs`

### `VITE_PEERJS_SECURE` (Optional)
- **Description**: Whether to use secure connection (HTTPS/WSS)
- **Default**: `true`
- **Values**: `true` or `false`

### `VITE_PEERJS_KEY` (Optional)
- **Description**: The PeerJS server key for authentication
- **Default**: `peerjs`
- **Example**: `your-secret-key`

## How to Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Click on **Secrets and variables** → **Actions** in the left sidebar
4. Click **New repository secret**
5. Add each secret with its name and value
6. Repeat for all required secrets

## Local Development

For local development, create a `.env.local` file in the `app/` directory with the same variables:

```bash
# app/.env.local
VITE_PEERJS_HOST=localhost
VITE_PEERJS_PORT=9000
VITE_PEERJS_PATH=/peerjs
VITE_PEERJS_SECURE=false
VITE_PEERJS_KEY=peerjs
```

## Running PeerJS Server Locally

To run a PeerJS server locally for development:

```bash
cd app
npm run peerjs:server
```

This starts a PeerJS server on `http://localhost:9000/peerjs` with key `peerjs`.

## Troubleshooting

- **"PeerJS signaling host is not configured"**: Make sure `VITE_PEERJS_HOST` secret is set
- **Connection failures**: Check that your PeerJS server is running and accessible
- **CORS issues**: Ensure your PeerJS server allows requests from your domain