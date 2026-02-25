---
title: Email Setup
weight: 40
---

Configure email service to send user credentials and password resets.

## Email Providers

ZIRI supports modular email providers:

-   **SMTP** - Any SMTP server (Gmail, Outlook, custom)
-   **SendGrid** - SendGrid API
-   **Mailgun** - Mailgun API
-   **SES** - AWS SES
-   **Manual** - No outbound email, credentials are returned in API responses

## SMTP Configuration

Configure SMTP in the UI or config file:

```json {filename="config.json"}
{
	"email": {
		"enabled": true,
		"provider": "smtp",
		"options": {
			"smtp": {
				"host": "smtp.example.com",
				"port": 587,
				"secure": false,
				"auth": {
					"user": "user@example.com",
					"pass": "password"
				}
			}
		},
		"fromByProvider": {
			"smtp": "noreply@example.com"
		}
	}
}
```

### Common SMTP Settings

**Gmail**:

```json
{
	"host": "smtp.gmail.com",
	"port": 587,
	"secure": false,
	"auth": {
		"user": "your-email@gmail.com",
		"pass": "your-app-password"
	}
}
```

> Gmail requires an App Password when 2FA is enabled.

**Outlook**:

```json
{
	"host": "smtp-mail.outlook.com",
	"port": 587,
	"secure": false,
	"auth": {
		"user": "your-email@outlook.com",
		"pass": "your-password"
	}
}
```

**Custom SMTP**:

```json
{
	"host": "smtp.yourdomain.com",
	"port": 587,
	"secure": false,
	"auth": {
		"user": "noreply@yourdomain.com",
		"pass": "your-password"
	}
}
```

### Port and Security

-   **Port 587** - STARTTLS (recommended)
-   **Port 465** - SSL/TLS (set `secure: true`)
-   **Port 25** - Usually blocked by ISPs

## SendGrid Configuration

```json {filename="config.json"}
{
	"email": {
		"enabled": true,
		"provider": "sendgrid",
		"options": {
			"sendgrid": {
				"apiKey": "SG.your-api-key-here"
			}
		},
		"fromByProvider": {
			"sendgrid": "noreply@example.com"
		}
	}
}
```

Get your API key from the SendGrid dashboard.

## Mailgun Configuration

```json {filename="config.json"}
{
	"email": {
		"enabled": true,
		"provider": "mailgun",
		"options": {
			"mailgun": {
				"apiKey": "key-your-mailgun-api-key",
				"domain": "mg.example.com",
				"apiUrl": "https://api.mailgun.net"
			}
		},
		"fromByProvider": {
			"mailgun": "noreply@example.com"
		}
	}
}
```

## SES Configuration

```json {filename="config.json"}
{
	"email": {
		"enabled": true,
		"provider": "ses",
		"options": {
			"ses": {
				"accessKeyId": "AKIA...",
				"secretAccessKey": "secret...",
				"region": "us-east-1"
			}
		},
		"fromByProvider": {
			"ses": "noreply@example.com"
		}
	}
}
```

## From Address

Set the sender address per provider:

```json
{
	"email": {
		"fromByProvider": {
			"smtp": "noreply@yourdomain.com"
		}
	}
}
```

## Testing Email

Validate your email configuration by creating a user or resetting a user password. Those flows send email when provider setup is valid.

```bash
curl -X POST http://localhost:3100/api/users \
  -H "Authorization: Bearer your-token"
```

## Email Templates

ZIRI sends these emails:

-   **User Credentials** – Sent when a user is created (username, password, login info).
-   **Password Reset** – Sent when a password is reset (new password included).

## Disabling Email

Set `enabled: false` or select `provider: "manual"`:

```json
{
	"email": {
		"enabled": false
	}
}
```

When disabled, passwords are shown in API responses instead of being emailed.

## Common Issues

| Issue                         | Fix                                                               |
| ----------------------------- | ----------------------------------------------------------------- |
| Gmail “Less Secure App” error | Enable 2FA and use an App Password                                |
| Connection timeout            | Verify firewall, host, port, connectivity                         |
| Authentication failed         | Check username/password or API key                                |
| Emails not sending            | Ensure email is enabled, test connection, review logs, check spam |

## Best Practices

1. **Use App Passwords** – Especially for Gmail.
2. **Prefer SendGrid in production** – More reliable than SMTP.
3. **Set a custom `from` address** – Use a domain you control.
4. **Test before relying on email** – Send a test message or create a dummy user.
5. **Monitor failures** – Check server logs for email errors.

## Next Steps

-   [Config File](/docs/configuration/config-file)
-   [Provider Setup Guide](/docs/guides/provider-setup)
-   [User Management Guide](/docs/guides/user-management)
