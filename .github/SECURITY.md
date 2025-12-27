# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously at UNISYNC. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainers directly or use GitHub's private vulnerability reporting
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity, typically 30-90 days

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Data breach, auth bypass | 24-48 hours |
| High | Significant security flaw | 7 days |
| Medium | Limited impact vulnerability | 30 days |
| Low | Minor security concern | 90 days |

## Security Measures

### Authentication & Authorization

- Firebase Authentication with email verification
- Role-based access control (Student, Faculty, Guard, Admin)
- Institutional email validation (`@cvsu.edu.ph`)
- Session management with secure tokens

### Data Protection

- Firestore Security Rules for data access control
- Storage Security Rules for file access
- Input validation and sanitization
- Content moderation for user-generated content

### Infrastructure

- Firebase App Check for API protection
- HTTPS enforcement
- Environment variables for sensitive configuration
- No secrets committed to version control

## Best Practices for Contributors

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Both client and server-side
3. **Follow least privilege** - Request minimum permissions
4. **Keep dependencies updated** - Regular security audits
5. **Review security rules** - Before deploying changes

## Responsible Disclosure

We kindly ask that you:

- Give us reasonable time to fix issues before public disclosure
- Avoid accessing or modifying user data
- Act in good faith to avoid privacy violations

We appreciate your help in keeping UNISYNC secure for all users.

---

**Contact**: [@JerichoDelosReyes](https://github.com/JerichoDelosReyes) | [@leeadriannorona](https://github.com/leeadriannorona)
