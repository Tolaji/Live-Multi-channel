# Live Multi-Channel

A real-time YouTube live stream monitoring dashboard that tracks when your favorite channels go live.

## 🎯 Features

- **Dual Mode Operation**
  - Power User Mode: Bring your own API key for unlimited channels
  - RSS Mode: Track up to 5 channels with our hosted service

- **Real-Time Updates**
  - RSS webhooks via PubSubHubbub for instant notifications
  - WebSocket connections for live UI updates
  - Fallback polling for reliability

- **Modern Tech Stack**
  - Frontend: React + Vite + Tailwind CSS
  - Backend: Node.js + Express + Socket.IO
  - Database: PostgreSQL + Redis
  - Authentication: Google OAuth 2.0

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Google Cloud Project with YouTube Data API v3 enabled

### Installation

1. Clone repository
```bash
git clone https://github.com/yourusername/live-multi-channel.git
cd live-multi-channel