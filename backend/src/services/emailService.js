/**
 * services/emailService.js — Brevo SMTP email integration
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Base helper function to send emails via Brevo SMTP API.
 * 
 * @param {{ to: string, subject: string, htmlContent: string, textContent: string }} options
 * @returns {Promise<object>} Brevo API response data
 */
async function sendEmail({ to, subject, htmlContent, textContent }) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "NearHire.AI";
  const apiKey = process.env.BREVO_API_KEY;

  console.log(`[Email Service] Attempting to send email to ${to}...`);

  // Write OTP to local file for automated test verification in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const fs = await import('fs');
      // Extract 6-digit OTP code from htmlContent or textContent if present
      const otpMatch = htmlContent.match(/style="font-size: 36px;[^>]*>\s*(\d{6})\s*<\/div>/) || htmlContent.match(/(\d{6})/);
      const otp = otpMatch ? otpMatch[1] : null;
      
      // Determine email type based on HTML text
      let type = 'LOGIN';
      if (htmlContent.includes('Reset Your Password')) {
        type = 'PASSWORD_RESET';
      } else if (htmlContent.includes('Verify Your Account')) {
        type = 'SIGNUP';
      }
      
      if (otp) {
        fs.writeFileSync('otp-debug.log', JSON.stringify({ email: to, otp, type, timestamp: Date.now() }));
        console.log(`[Email Service] [DEV] Logged OTP ${otp} (${type}) to otp-debug.log`);
      }
    } catch (err) {
      console.error("Error writing debug OTP file:", err);
    }
  }

  // If mock mode is explicitly turned on or there is no API key, skip real Brevo send
  if (process.env.AWS_SES_MOCK === 'true' || !apiKey || apiKey === 'your_brevo_api_key_here') {
    console.log(`[Email Service] [MOCK MODE] Email send bypassed. Recipient: ${to}, Subject: "${subject}"`);
    return { messageId: "mock-message-id" };
  }

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );
    console.log(`[Email Service] Email sent successfully to ${to}. MessageId: ${response.data.messageId}`);
    return response.data;
  } catch (error) {
    console.error(`[Email Service] Failed to send email via Brevo to ${to}:`, error.response?.data || error.message);
    throw new Error(`Brevo send failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Send OTP verification email to user (Login, Signup, or Reset Password).
 * 
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} type - 'LOGIN', 'PASSWORD_RESET', or 'SIGNUP'
 * @returns {Promise<object>}
 */
export async function sendOtpEmail(email, otp, type = 'LOGIN') {
  let title = 'Verification Code';
  let messageText = 'Use the following 6-digit one-time password (OTP) to log in to your account.';
  if (type === 'PASSWORD_RESET') {
    title = 'Reset Your Password';
    messageText = 'Use the following 6-digit verification code to reset your password.';
  } else if (type === 'SIGNUP') {
    title = 'Verify Your Account';
    messageText = 'Use the following 6-digit verification code to verify your new NearHire.AI account.';
  }

  const subject = `[NearHire.AI] ${title}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #4f46e5; text-align: center; margin-bottom: 24px;">NearHire.AI — ${title}</h2>
      <p>Hello,</p>
      <p>${messageText} This code is confidential and should not be shared.</p>
      <div style="font-size: 36px; font-weight: 800; text-align: center; color: #1e1b4b; background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; letter-spacing: 6px; border: 1px solid #f1f5f9;">
        ${otp}
      </div>
      <p>This OTP is valid for <strong>5 minutes</strong>. If you did not make this request, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">NearHire.AI — Hyperlocal Job Discovery Platform</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent: `${messageText} Code: ${otp}. Valid for 5 minutes.`,
  });
}

/**
 * Send Welcome Email to newly registered user.
 * 
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @returns {Promise<object>}
 */
export async function sendWelcomeEmail(email, name) {
  const subject = "Welcome to NearHire.AI!";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #4f46e5; text-align: center; margin-bottom: 24px;">Welcome to NearHire.AI!</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Thank you for registering on NearHire.AI! We're excited to help you discover the best hyperlocal job opportunities matching your skills and preferences.</p>
      <p>Here are a few things you can do to get started:</p>
      <ul style="line-height: 1.6;">
        <li><strong>Upload your Resume</strong>: Our AI parsing engine will automatically extract your skills and build your candidate profile.</li>
        <li><strong>Search Jobs</strong>: Filter jobs by salary, distance, work mode, and category.</li>
        <li><strong>Chat with AI Career Advisor</strong>: Get resume tips and job recommendations directly from our intelligent assistant.</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="http://localhost:5173/dashboard" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">NearHire.AI — Hyperlocal Job Discovery Platform</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent: `Hi ${name}, welcome to NearHire.AI! We are thrilled to help you find your next job. Go to http://localhost:5173/dashboard to get started.`,
  });
}

/**
 * Send Job Alert email.
 * 
 * @param {string} email - Recipient email
 * @param {Array<object>} jobs - List of matched jobs
 * @returns {Promise<object>}
 */
export async function sendJobAlertEmail(email, jobs = []) {
  const subject = `[NearHire.AI] New Job Alerts Matching Your Profile`;
  const jobsListHtml = jobs.map(job => `
    <div style="padding: 15px; border-bottom: 1px solid #f1f5f9;">
      <h4 style="margin: 0 0 5px 0; color: #1e1b4b;">${job.title}</h4>
      <p style="margin: 0 0 5px 0; font-size: 14px; color: #4b5563;">Company: ${job.companyName || 'Unknown Company'}</p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">Location: ${job.city || 'N/A'}, ${job.state || 'N/A'} | Type: ${job.jobType || 'N/A'}</p>
    </div>
  `).join('');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #4f46e5; text-align: center; margin-bottom: 24px;">New Job Openings for You</h2>
      <p>Hello,</p>
      <p>Based on your preferred roles and skills, we found new job matches in your area:</p>
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 20px 0;">
        ${jobsListHtml}
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="http://localhost:5173/search" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View All Matches</a>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">NearHire.AI — Hyperlocal Job Discovery Platform</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent: `We found new job alert matches for you! Check them out at http://localhost:5173/search`,
  });
}
