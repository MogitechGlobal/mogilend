import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    // Configure this with your actual SMTP credentials from the .env file
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mogitechglobal.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      // process.env values are always strings, so we explicitly check if it equals 'true'
      secure: process.env.SMTP_SECURE === 'true', 
      auth: {
        user: process.env.SMTP_USER || '', 
        pass: process.env.SMTP_PASS || '', 
      },
    });
  }

  async sendLenderWelcomeEmail(email: string, companyName: string, tempPassword: string) {
    const loginUrl = 'https://lendos.mogitechglobal.com/'; // Your production URL

    const mailOptions = {
      // Pulling the custom formatted "From" address from your .env
      from: process.env.SMTP_FROM || '"MogiLend System" <lendos@mogitechglobal.com>',
      to: email,
      subject: `Welcome to MogiLend - Your Institutional Credentials`,
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #0B1121;">Welcome to MogiLend, ${companyName}!</h2>
          <p>Your institutional workspace has been successfully provisioned on our enterprise credit infrastructure.</p>
          
          <div style="background-color: #F8FAFC; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Your Login Credentials:</strong></p>
            <p style="margin: 0 0 5px 0;"><strong>Portal URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p style="margin: 0 0 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</span></p>
          </div>

          <p><em>Security Notice: Please log in using the temporary password above and navigate to your Profile Settings to update your password immediately.</em></p>
          
          <br/>
          <p style="font-size: 12px; color: #64748b;">
            &copy; ${new Date().getFullYear()} Mogitech Global Ltd.<br/>
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email dispatched to ${email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
}