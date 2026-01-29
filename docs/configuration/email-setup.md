# Email Setup

Configure email service to send user credentials and password resets.

## Email Providers

ZIRI supports two email providers:

- **SMTP** - Any SMTP server (Gmail, Outlook, custom)
- **SendGrid** - SendGrid API

## SMTP Configuration

Configure SMTP in the UI or config file:

```json
{
  "email": {
    "enabled": true,
    "provider": "smtp",
    "smtp": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "user@example.com",
        "pass": "password"
      }
    },
    "from": "noreply@example.com"
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

**Note**: Gmail requires an App Password if 2FA is enabled. Don't use your regular password.

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

- **Port 587** - STARTTLS (recommended)
- **Port 465** - SSL/TLS (set `secure: true`)
- **Port 25** - Usually blocked by ISPs

## SendGrid Configuration

Configure SendGrid in the UI or config file:

```json
{
  "email": {
    "enabled": true,
    "provider": "sendgrid",
    "sendgrid": {
      "apiKey": "SG.your-api-key-here"
    },
    "from": "noreply@example.com"
  }
}
```

Get your API key from the SendGrid dashboard.

## From Address

Set the `from` address for all emails:

```json
{
  "email": {
    "from": "noreply@yourdomain.com"
  }
}
```

This appears as the sender in email notifications.

## Testing Email

Test your email configuration via the Providers API:

```bash
# Test provider connection (this also tests email if configured)
curl -X POST http://localhost:3100/api/providers/openai/test \
  -H "Authorization: Bearer your-token"
```

Or create a test user and check if the email is sent.

## Email Templates

ZIRI sends these emails:

### User Credentials

Sent when a user is created (if email enabled):

- Subject: "Your ZIRI Credentials"
- Body: Includes username, password, and login instructions

### Password Reset

Sent when a password is reset (if email enabled):

- Subject: "Your ZIRI Password Has Been Reset"
- Body: Includes new password

## Disabling Email

Set `enabled: false`:

```json
{
  "email": {
    "enabled": false
  }
}
```

When disabled, passwords are shown in API responses instead of being emailed.

## Common Issues

### Gmail "Less Secure App" Error

Gmail blocks less secure apps. Solutions:

1. Enable 2FA
2. Generate an App Password
3. Use the App Password instead of your regular password

### Connection Timeout

Check:
- Firewall allows SMTP ports
- Host and port are correct
- Network connectivity

### Authentication Failed

Check:
- Username and password are correct
- App Password is used (for Gmail with 2FA)
- Account is not locked

### Emails Not Sending

Check:
- Email is enabled in config
- Provider is configured correctly
- Test connection works
- Check server logs for errors

## Best Practices

1. **Use App Passwords** - For Gmail, use App Passwords, not regular passwords
2. **Use SendGrid for production** - More reliable than SMTP
3. **Set from address** - Use a domain you control
4. **Test first** - Test email before relying on it
5. **Monitor failures** - Check logs if emails aren't arriving

## Next Steps

- [Config File](/configuration/config-file) - Config file structure
- [Provider Setup Guide](/guides/provider-setup) - Provider configuration
- [User Management Guide](/guides/user-management) - Creating users
