 

import { loadConfig, type ProxyConfig } from '../config.js'
import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

 
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = loadConfig()
  const emailConfig = config.email
  
  if (!emailConfig?.enabled) {
    console.log('[EMAIL] Email disabled, skipping send')
    return false
  }
  
  try {
    switch (emailConfig.provider) {
      case 'smtp':
        return await sendViaSMTP(options, emailConfig.smtp!, emailConfig.from)
      
      case 'sendgrid':
        return await sendViaSendGrid(options, emailConfig.sendgrid!.apiKey, emailConfig.from)
      
      case 'manual':
      default:
 
        console.log('[EMAIL] Manual mode - email content:')
        console.log('='.repeat(70))
        console.log(`To: ${options.to}`)
        console.log(`Subject: ${options.subject}`)
        console.log('---')
        console.log(options.text || options.html)
        console.log('='.repeat(70))
        return true
    }
  } catch (error: any) {
    console.error('[EMAIL] Failed to send email:', error)
    return false
  }
}

 
async function sendViaSMTP(
  options: EmailOptions,
  smtpConfig: NonNullable<ProxyConfig['email']>['smtp'],
  from?: string
): Promise<boolean> {
  if (!smtpConfig) {
    throw new Error('SMTP configuration not provided')
  }
  
 
 
 
  let secure = smtpConfig.secure || false
  let requireTLS = false
  
  if (smtpConfig.port === 465) {
 
    secure = true
    requireTLS = false
  } else if (smtpConfig.port === 587) {
 
    secure = false
    requireTLS = true
  } else {
 
    secure = smtpConfig.secure || false
    requireTLS = smtpConfig.secure || false
  }
  
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: secure,
    requireTLS: requireTLS,
    auth: {
      user: smtpConfig.auth.user,
      pass: smtpConfig.auth.pass
    }
  })
  
  await transporter.sendMail({
    from: from || smtpConfig.auth.user,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  })
  
  return true
}

 
async function sendViaSendGrid(
  options: EmailOptions,
  apiKey: string,
  from?: string
): Promise<boolean> {
  if (!from) {
    throw new Error('From address required for SendGrid')
  }
  
  sgMail.setApiKey(apiKey)
  
  await sgMail.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  })
  
  return true
}

 
export function generateUserCredentialsEmail(data: {
  name: string
  userId: string
  password: string
  gatewayUrl: string
}): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ZIRI Credentials</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ZIRI</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${data.name}!</h2>
    
    <p>Your ZIRI account has been created. Here are your credentials:</p>
    
    <div style="background: white; border: 2px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <div style="margin-bottom: 15px;">
        <strong style="color: #6b7280; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase;">User ID</strong>
        <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; display: inline-block;">${data.userId}</code>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #6b7280; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase;">Password</strong>
        <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; display: inline-block;">${data.password}</code>
      </div>
      
      <div>
        <strong style="color: #6b7280; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase;">Gateway URL</strong>
        <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; display: inline-block; word-break: break-all;">${data.gatewayUrl}</code>
      </div>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong style="color: #92400e; display: block; margin-bottom: 5px;">⚠️ Important</strong>
      <p style="color: #78350f; margin: 0; font-size: 14px;">Save these credentials securely. Your password will not be shown again.</p>
    </div>
    
    <h3 style="color: #1f2937; margin-top: 30px;">Getting Started</h3>
    
    <p>To use the gateway, you'll need to:</p>
    
    <ol style="padding-left: 20px;">
      <li style="margin-bottom: 10px;">Install the SDK: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 12px;">npm install @ziri/sdk</code></li>
      <li style="margin-bottom: 10px;">Authenticate with your User ID and password to get an access token</li>
      <li style="margin-bottom: 10px;">Create an API key through the admin interface</li>
      <li style="margin-bottom: 10px;">Use your API key and access token to make LLM requests</li>
    </ol>
    
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <strong style="color: #1e40af; display: block; margin-bottom: 5px;">Example SDK Usage</strong>
      <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin: 10px 0 0 0;"><code>import { UserSDK } from '@ziri/sdk'

const client = new UserSDK({
  gatewayUrl: '${data.gatewayUrl}',
  userId: '${data.userId}',
  password: '${data.password}'
})

 
await client.authenticate()

 
const response = await client.chat.completions({
  provider: 'openai',
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})</code></pre>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you have any questions, please contact your administrator.
    </p>
  </div>
</body>
</html>
  `.trim()
  
  const text = `
ZIRI - Your Credentials

Welcome, ${data.name}!

Your ZIRI account has been created. Here are your credentials:

User ID: ${data.userId}
Password: ${data.password}
Gateway URL: ${data.gatewayUrl}

⚠️ Important: Save these credentials securely. Your password will not be shown again.

Getting Started:

1. Install the SDK: npm install @ziri/sdk
2. Authenticate with your User ID and password to get an access token
3. Create an API key through the admin interface
4. Use your API key and access token to make LLM requests

Example SDK Usage:

import { UserSDK } from '@ziri/sdk'

const client = new UserSDK({
  gatewayUrl: '${data.gatewayUrl}',
  userId: '${data.userId}',
  password: '${data.password}'
})

 
await client.authenticate()

 
const response = await client.chat.completions({
  provider: 'openai',
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
})

If you have any questions, please contact your administrator.
  `.trim()
  
  return { html, text }
}

 
export function generatePasswordResetEmail(data: {
  name: string
  userId: string
  password: string
  gatewayUrl: string
}): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Password Has Been Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hello, ${data.name}!</h2>
    
    <p>Your ZIRI password has been reset. Here are your new credentials:</p>
    
    <div style="background: white; border: 2px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <div style="margin-bottom: 15px;">
        <strong style="color: #6b7280; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase;">User ID</strong>
        <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; display: inline-block;">${data.userId}</code>
      </div>
      
      <div>
        <strong style="color: #6b7280; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase;">New Password</strong>
        <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; font-size: 14px; display: inline-block;">${data.password}</code>
      </div>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong style="color: #92400e; display: block; margin-bottom: 5px;">⚠️ Important</strong>
      <p style="color: #78350f; margin: 0; font-size: 14px;">Save this password securely. Your old password is no longer valid.</p>
    </div>
    
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <strong style="color: #1e40af; display: block; margin-bottom: 5px;">Next Steps</strong>
      <p style="color: #1e3a8a; margin: 0; font-size: 14px;">Use your User ID and new password to authenticate and access the gateway.</p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you did not request this password reset, please contact your administrator immediately.
    </p>
  </div>
</body>
</html>
  `.trim()
  
  const text = `
Password Reset - ZIRI

Hello, ${data.name}!

Your ZIRI password has been reset. Here are your new credentials:

User ID: ${data.userId}
New Password: ${data.password}

⚠️ Important: Save this password securely. Your old password is no longer valid.

Next Steps:
Use your User ID and new password to authenticate and access the gateway.

If you did not request this password reset, please contact your administrator immediately.
  `.trim()
  
  return { html, text }
}
