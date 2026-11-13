# Fiber Power Computing API — foundation

This is the first backend milestone. It provides a small Node.js API process, PostgreSQL connectivity checks, security headers, strict CORS allowlisting, JSON request limits, and basic API rate limiting.

## What is included

- `GET /health`: process health check (does not expose secrets).
- `GET /api/v1/ready`: checks PostgreSQL connectivity.
- No public device-control routes. MikroTik/OLT credentials and commands must remain server-side and must be added only after authentication, authorization, audit logging, and per-device allowlists are implemented.

## Run locally

1. Install Node.js 20 or newer and PostgreSQL.
2. From this folder, run `npm install`.
3. Create a database and user in PostgreSQL.
4. Copy `.env.example` to `.env` and set `DATABASE_URL`.
5. Set `ALLOWED_ORIGINS` to the exact frontend origin(s).
6. Run `npm run dev`.
7. Test `http://localhost:3000/health` and `http://localhost:3000/api/v1/ready`.

Never commit `.env`, passwords, router credentials, SNMP community strings, API keys, or private certificates.

## Deployment

GitHub Pages continues to host the static frontend. Deploy this folder as a separate Node.js service with a managed PostgreSQL database. Configure environment variables in the backend host's secret settings, enable TLS to PostgreSQL when required by that host, and use HTTPS for the public API.

Before production use, implement and test:
1. Database migrations and backups.
2. Admin authentication, secure sessions, roles, and account recovery.
3. CSRF protection if cookie-based authentication is used.
4. Audit logging and input validation for all writes.
5. Device-specific read-only SNMP/API integrations with strict network allowlists.
6. Vendor- and model-specific OLT/ONU support; do not assume EPON equipment supports GPON OMCI.
7. Monitoring, alerting, retention policies, and restore testing.

This milestone is a backend foundation, not a production-ready authenticated management system. Do not expose it as a subscriber or device-control service until the remaining controls are implemented.
