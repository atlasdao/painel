# Atlas Painel - Production Deployment Checklist

## 🚀 PRE-DEPLOYMENT CHECKLIST

### 1. CODE CLEANUP ✅
- [ ] Remove all `console.log`, `console.warn`, `console.error` statements
- [ ] Remove development artifacts (`cookies.txt`, `backend.log`, etc.)
- [ ] Remove commented-out code
- [ ] Ensure no hardcoded secrets or API keys
- [ ] Remove debug imports and utilities

### 2. SECURITY CONFIGURATION 🔒
- [ ] Set strong `ENCRYPTION_KEY` environment variable
- [ ] Configure `SESSION_SECRET` with cryptographically strong value
- [ ] Set `JWT_SECRET` with minimum 256-bit entropy
- [ ] Configure `ALLOWED_ORIGINS` for CORS whitelist
- [ ] Verify SSL/TLS certificates are valid
- [ ] Enable HSTS in production

### 3. ENVIRONMENT VARIABLES 🌍
#### Backend (.env)
```bash
NODE_ENV=production
PORT=19997
DATABASE_URL=postgresql://...
JWT_SECRET=<256-bit-secret>
ENCRYPTION_KEY=<256-bit-key>
SESSION_SECRET=<256-bit-secret>
ALLOWED_ORIGINS=["https://yourdomain.com"]
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NODE_ENV=production
```

### 4. DATABASE PREPARATION 💾
- [ ] Run production migrations: `npx prisma migrate deploy`
- [ ] Seed initial data: `npm run seed`
- [ ] Verify database connections and indexes
- [ ] Set up database backups
- [ ] Configure connection pooling

### 5. SECURITY HEADERS VERIFICATION 🛡️
- [ ] Content Security Policy configured
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Strict-Transport-Security configured
- [ ] Referrer-Policy configured

### 6. PERFORMANCE OPTIMIZATION ⚡
- [ ] Enable gzip compression
- [ ] Configure CDN for static assets
- [ ] Set appropriate cache headers
- [ ] Minimize bundle sizes
- [ ] Enable HTTP/2
- [ ] Configure load balancing

### 7. MONITORING & LOGGING 📊
- [ ] Configure structured logging (Winston/Pino)
- [ ] Set up error tracking (Sentry, Bugsnag)
- [ ] Configure application monitoring (New Relic, DataDog)
- [ ] Set up health check endpoints
- [ ] Configure alerting for critical errors
- [ ] Set up uptime monitoring

### 8. BACKUP & DISASTER RECOVERY 💼
- [ ] Database backup strategy
- [ ] File backup strategy
- [ ] Disaster recovery plan
- [ ] Point-in-time recovery capability
- [ ] Backup restoration testing

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Build Applications
```bash
# Backend
cd Atlas-API
npm run build
npm run test

# Frontend
cd Atlas-Panel
npm run build
npm run start # Test production build
```

### Step 2: Database Setup
```bash
# Run migrations
cd Atlas-API
npx prisma migrate deploy
npx prisma generate
npm run seed
```

### Step 3: Security Verification
```bash
# Check for console statements
grep -r "console\." src/ --include="*.ts" --exclude-dir=node_modules

# Check for hardcoded secrets
grep -r "password\|secret\|key" src/ --include="*.ts" --exclude-dir=node_modules

# Verify environment variables
node -e "console.log(Object.keys(process.env).filter(k => k.includes('SECRET') || k.includes('KEY')))"
```

### Step 4: Performance Testing
```bash
# Load testing
npm install -g artillery
artillery quick --count 10 -n 20 http://localhost:19997/health

# Security testing
npm install -g nsp
nsp check
```

---

## 🌐 INFRASTRUCTURE REQUIREMENTS

### Minimum Server Specifications
- **CPU:** 2 vCPUs
- **RAM:** 4GB
- **Storage:** 50GB SSD
- **Network:** 1Gbps
- **OS:** Ubuntu 20.04+ or similar

### Recommended Architecture
```
[Load Balancer/CDN] → [Application Servers] → [Database]
                    ↓
                [Cache Layer (Redis)]
```

### Container Deployment (Docker)
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 19997
CMD ["npm", "start"]
```

---

## 🔐 SECURITY HARDENING

### System Level
- [ ] Configure firewall rules
- [ ] Disable unnecessary services
- [ ] Update system packages
- [ ] Configure SSH key authentication
- [ ] Set up fail2ban
- [ ] Configure log rotation

### Application Level
- [ ] Run as non-root user
- [ ] Limit file permissions
- [ ] Configure rate limiting at reverse proxy
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure DDoS protection

### Database Level
- [ ] Create database user with minimal privileges
- [ ] Configure connection limits
- [ ] Enable query logging
- [ ] Set up replication
- [ ] Configure backup encryption

---

## 📋 POST-DEPLOYMENT VERIFICATION

### Functional Testing
```bash
# Health check
curl https://api.yourdomain.com/health

# Authentication test
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"password"}'

# API key test
curl -H "X-API-Key: your-api-key" https://api.yourdomain.com/api/v1/profile
```

### Security Testing
```bash
# Security headers check
curl -I https://api.yourdomain.com/api/v1/health

# Rate limiting test
for i in {1..10}; do curl https://api.yourdomain.com/api/v1/health; done

# SSL configuration test
nmap --script ssl-enum-ciphers -p 443 yourdomain.com
```

### Performance Testing
```bash
# Response time test
curl -w "@curl-format.txt" -o /dev/null -s https://api.yourdomain.com/health

# Load test
ab -n 1000 -c 10 https://api.yourdomain.com/health
```

---

## 🚨 ROLLBACK PLAN

### Preparation
1. Create deployment tags in Git
2. Backup database before deployment
3. Keep previous Docker images
4. Document rollback procedures

### Rollback Steps
1. **Immediate:** Switch load balancer to previous version
2. **Database:** Restore from backup if needed
3. **Application:** Deploy previous Docker image
4. **Verification:** Run health checks
5. **Communication:** Notify stakeholders

---

## 📱 MONITORING DASHBOARD

### Key Metrics to Monitor
- **Availability:** Uptime percentage
- **Performance:** Response times, throughput
- **Errors:** Error rates, exceptions
- **Security:** Failed login attempts, rate limit hits
- **Business:** Transaction volumes, user activity

### Alert Thresholds
- Response time > 2 seconds
- Error rate > 1%
- CPU usage > 80%
- Memory usage > 85%
- Disk usage > 90%

---

## 📞 INCIDENT RESPONSE

### Escalation Levels
1. **Level 1:** Service degradation (Response: 15 minutes)
2. **Level 2:** Partial outage (Response: 5 minutes)
3. **Level 3:** Complete outage (Response: 2 minutes)

### Contact Information
- **DevOps Team:** devops@yourdomain.com
- **Security Team:** security@yourdomain.com
- **On-call Engineer:** +55 11 99999-9999

---

## ✅ FINAL CHECKLIST

- [ ] All code changes reviewed and approved
- [ ] Security audit completed and issues resolved
- [ ] Performance testing passed
- [ ] Database migrations tested
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented and tested
- [ ] Team trained on new features
- [ ] Documentation updated
- [ ] Stakeholders notified of deployment

---

**Deployment Date:** ___________
**Deployed By:** ___________
**Version:** ___________
**Rollback Trigger:** ___________

**Post-Deployment Review Date:** ___________