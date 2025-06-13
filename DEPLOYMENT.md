# Snake Word Arena - Production Deployment Guide

## Overview

Snake Word Arena is a production-ready multiplayer word game built with:
- **Frontend**: React + TypeScript + Vite + PixiJS + Tailwind CSS
- **Backend**: Node.js + Express + WebSocket + TypeScript
- **Database**: Neon PostgreSQL (serverless)
- **Deployment**: Vercel (frontend & backend)
- **Architecture**: Turborepo monorepo with shared types

## 🚀 Quick Deployment

### Prerequisites

1. **Neon Database Account**: [neon.tech](https://neon.tech)
2. **Vercel Account**: [vercel.com](https://vercel.com)
3. **Node.js**: v18+ and pnpm

### 1. Database Setup (Neon)

1. Create a new Neon project
2. Copy the connection string
3. Run database migrations:

```bash
# Set environment variable
export DATABASE_URL="your-neon-connection-string"

# Install dependencies
pnpm install

# Generate database migration files
cd apps/game-server
pnpm exec drizzle-kit generate:pg

# Run migrations
pnpm run db:migrate
```

### 2. Environment Configuration

Create `.env.local` files:

**Root `.env.local`:**
```env
# Database
DATABASE_URL=your-neon-connection-string
NEON_DATABASE_URL=your-neon-connection-string

# Server
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-vercel-app.vercel.app

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

**`apps/game-client/.env.local`:**
```env
VITE_API_URL=https://your-vercel-app.vercel.app/api
VITE_WS_URL=wss://your-vercel-app.vercel.app/ws
```

### 3. Build & Deploy to Vercel

```bash
# Build all packages
pnpm run build

# Deploy to Vercel
vercel --prod
```

## 🏗️ Architecture

### Monorepo Structure
```
.
├── apps/
│   ├── game-client/          # React frontend
│   └── game-server/          # Node.js backend
├── packages/
│   └── shared-types/         # Shared TypeScript types
├── vercel.json              # Deployment configuration
└── DEPLOYMENT.md           # This file
```

### Database Schema

#### Tables:
- **players**: User profiles and statistics
- **games**: Game sessions and metadata
- **game_participants**: Player participation in games
- **achievements**: Achievement definitions
- **player_achievements**: User achievement progress
- **leaderboards**: Cached leaderboard data
- **player_sessions**: Active connection tracking
- **word_submissions**: Word validation history

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string | `postgresql://...` |
| `NODE_ENV` | No | Environment mode | `production` |
| `PORT` | No | Server port | `3001` |
| `CORS_ORIGIN` | No | Allowed CORS origins | `https://app.vercel.app` |

### Performance Tuning

**Rate Limiting:**
- API: 100 requests/minute per IP
- WebSocket: 50 messages/minute per IP

**Connection Limits:**
- Max concurrent players: 8
- WebSocket timeout: 60 seconds
- Heartbeat interval: 30 seconds

**Monitoring Thresholds:**
- Memory usage warning: 80%
- Response time warning: 1000ms
- Error rate warning: 5%

## 🔍 Monitoring & Health Checks

### Endpoints

- **Health Check**: `GET /health`
- **Metrics**: `GET /metrics`
- **Server Status**: `GET /api/status`

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "database": "healthy",
  "checks": {
    "memory": { "status": "healthy", "value": "45.2%", "threshold": "80%" },
    "response_time": { "status": "healthy", "value": "120ms", "threshold": "1000ms" },
    "concurrent_players": { "status": "healthy", "value": 3, "threshold": 6 }
  }
}
```

## 🚨 Error Handling

### Circuit Breaker Pattern
- Database operations protected by circuit breaker
- 5 failure threshold, 60-second timeout
- Automatic retry with exponential backoff

### Error Types
- `DATABASE_ERROR`: Database connection/query issues
- `WEBSOCKET_ERROR`: WebSocket connection problems
- `VALIDATION_ERROR`: Input validation failures
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `GAME_LOGIC_ERROR`: Game state inconsistencies

### Graceful Degradation
- Database unavailable → In-memory mode
- WebSocket issues → Auto-reconnection with exponential backoff
- High load → Rate limiting and connection throttling

## 📊 Performance Optimizations

### Backend
- **Compression**: Gzip compression for all responses
- **Rate Limiting**: Memory-based rate limiting
- **Connection Pooling**: Neon serverless automatic pooling
- **WebSocket Compression**: Per-message deflate
- **Heartbeat Monitoring**: Inactive connection cleanup

### Frontend
- **Code Splitting**: Route-based code splitting
- **Asset Optimization**: Vite build optimization
- **WebSocket Manager**: Automatic reconnection
- **Performance Monitoring**: Client-side error tracking

### Database
- **Indexes**: Optimized queries with proper indexing
- **Connection Limits**: Neon serverless auto-scaling
- **Query Optimization**: Efficient leaderboard queries
- **Cleanup Jobs**: Automatic session cleanup

## 🔒 Security

### Server Security
- **Helmet.js**: Security headers
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: DDoS protection
- **Input Validation**: Request validation
- **Error Sanitization**: Production error hiding

### WebSocket Security
- **Rate Limiting**: Message rate limiting
- **Origin Validation**: Connection origin checking
- **Session Management**: Secure session tracking
- **Heartbeat Monitoring**: Connection validation

## 🔄 Deployment Process

### 1. Pre-deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Build process successful
- [ ] Tests passing
- [ ] Security scan complete

### 2. Deployment Steps
```bash
# 1. Install dependencies
pnpm install

# 2. Run tests
pnpm run test

# 3. Build applications
pnpm run build

# 4. Deploy to Vercel
vercel --prod

# 5. Run database migrations
pnpm run db:migrate

# 6. Verify deployment
curl https://your-app.vercel.app/health
```

### 3. Post-deployment Verification
- [ ] Health checks passing
- [ ] WebSocket connections working
- [ ] Database queries successful
- [ ] Performance metrics normal
- [ ] Error rates acceptable

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Run migrations
pnpm run db:migrate
```

**WebSocket Connection Issues:**
- Check CORS configuration
- Verify WebSocket URL format
- Check network/firewall settings
- Monitor connection logs

**High Memory Usage:**
- Check for memory leaks
- Monitor garbage collection
- Review connection cleanup
- Scale Vercel function

**Performance Degradation:**
- Check database query performance
- Monitor concurrent connections
- Review error rates
- Check resource utilization

## 📈 Scaling Considerations

### Current Limits
- **Concurrent Players**: 8 (configurable)
- **Database Connections**: Neon auto-scaling
- **Memory Usage**: Vercel function limits
- **Request Rate**: 100/minute per IP

### Scaling Strategies
1. **Horizontal Scaling**: Multiple Vercel deployments
2. **Database Scaling**: Neon automatic scaling
3. **CDN Integration**: Static asset optimization
4. **Load Balancing**: Multiple server instances

## 📝 Maintenance

### Regular Tasks
- **Weekly**: Review performance metrics
- **Monthly**: Database optimization
- **Quarterly**: Security audit
- **Annually**: Architecture review

### Monitoring Alerts
- Memory usage > 90%
- Response time > 2000ms
- Error rate > 10%
- Connection failures > 5/minute

## 📞 Support

### Logs Access
```bash
# Vercel function logs
vercel logs

# Database logs
# Available in Neon dashboard
```

### Key Metrics
- **Uptime**: Target 99.9%
- **Response Time**: < 500ms average
- **Error Rate**: < 1%
- **Concurrent Users**: Up to 8

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Support**: [Create an issue](https://github.com/your-repo/issues) 