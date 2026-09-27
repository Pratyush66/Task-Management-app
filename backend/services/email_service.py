import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional
from config import Config

logger = logging.getLogger(__name__)

# Dedicated thread pool executor for non-blocking email delivery.
# This prevents SMTP network latency (1-2s) from blocking the Flask request-response cycle.
_email_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="email_worker")


class GmailEmailService:
    """
    Service responsible for dispatching email notifications via Gmail SMTP.
    Supports asynchronous dispatch, HTML templates, and safe fallback logging.
    """

    @staticmethod
    def _send_smtp_email(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """
        Internal worker function executed in background thread to perform SMTP delivery.
        """
        if not Config.is_gmail_configured():
            logger.info(
                f"\n{'='*70}\n"
                f"[GMAIL SERVICE - LOCAL SIMULATION]\n"
                f"To: {to_email}\n"
                f"Subject: {subject}\n"
                f"Content Summary:\n{text_content}\n"
                f"{'='*70}\n"
                f"Notice: Set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env to send real emails via Gmail.\n"
            )
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{Config.MAIL_FROM_NAME} <{Config.GMAIL_USER}>"
            msg["To"] = to_email

            # Attach plain-text and HTML versions (clients pick best suited)
            part1 = MIMEText(text_content, "plain", "utf-8")
            part2 = MIMEText(html_content, "html", "utf-8")
            msg.attach(part1)
            msg.attach(part2)

            # Connect to Gmail SMTP using SSL
            with smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT, timeout=10) as server:
                server.login(Config.GMAIL_USER, Config.GMAIL_APP_PASSWORD)
                server.send_message(msg)

            logger.info(f"[Gmail Service] Successfully sent email to {to_email} (Subject: '{subject}')")
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(
                f"[Gmail Service] Authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD: {e}"
            )
            return False
        except Exception as e:
            logger.error(f"[Gmail Service] Error sending email to {to_email}: {e}")
            return False

    @classmethod
    def dispatch_email_async(cls, to_email: str, subject: str, html_content: str, text_content: str):
        """
        Submits email task to background thread pool. Non-blocking.
        """
        if not to_email:
            logger.warning("[Gmail Service] Skipping email dispatch: Recipient email is empty.")
            return
            
        _email_executor.submit(
            cls._send_smtp_email,
            to_email,
            subject,
            html_content,
            text_content
        )

    # --------------------------------------------------------------------------
    # Notification: Task Created & Assigned
    # --------------------------------------------------------------------------
    @classmethod
    def notify_task_created(cls, task: Dict[str, Any], creator: Dict[str, Any], assignee: Optional[Dict[str, Any]]):
        """
        Dispatches notification when a new task is created and assigned to someone.
        """
        if not assignee or not assignee.get("email"):
            return

        to_email = assignee.get("email")
        assignee_name = assignee.get("full_name") or assignee.get("email", "Team Member")
        creator_name = creator.get("full_name") or creator.get("email", "A colleague")
        task_title = task.get("title", "Untitled Task")
        description = task.get("description") or "No description provided."
        priority = task.get("priority", "medium").upper()
        due_date = task.get("due_date", "No due date specified")
        app_url = Config.FRONTEND_URL

        subject = f"[TaskFlow] New Task Assigned: {task_title}"

        # Color token based on priority
        priority_colors = {
            "URGENT": "#dc2626",
            "HIGH": "#ea580c",
            "MEDIUM": "#2563eb",
            "LOW": "#64748b"
        }
        badge_color = priority_colors.get(priority, "#2563eb")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
            .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 32px; color: #ffffff; }}
            .brand {{ font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }}
            .header h1 {{ margin: 8px 0 0 0; font-size: 20px; font-weight: 600; color: #ffffff; }}
            .body {{ padding: 32px; }}
            .task-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .badge {{ display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; background: {badge_color}; }}
            .meta-row {{ margin-top: 14px; font-size: 14px; color: #64748b; line-height: 1.6; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 24px; }}
            .footer {{ padding: 20px 32px; background: #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">TaskFlow Notifications</div>
              <h1>You have been assigned a new task</h1>
            </div>
            <div class="body">
              <p>Hi <strong>{assignee_name}</strong>,</p>
              <p><strong>{creator_name}</strong> has created and assigned a new task to you:</p>
              
              <div class="task-card">
                <div style="margin-bottom: 8px;">
                  <span class="badge">{priority} PRIORITY</span>
                </div>
                <h2 style="margin: 8px 0; font-size: 18px; color: #0f172a;">{task_title}</h2>
                <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px; white-space: pre-wrap;">{description}</p>
                <div class="meta-row">
                  <div><strong>Due Date:</strong> {due_date}</div>
                  <div><strong>Assigned by:</strong> {creator_name} ({creator.get('email', '')})</div>
                </div>
              </div>

              <a href="{app_url}" class="button">View Task in TaskFlow &rarr;</a>
            </div>
            <div class="footer">
              This is an automated notification from TaskFlow. Please do not reply directly to this email.
            </div>
          </div>
        </body>
        </html>
        """

        text_content = f"""
Hello {assignee_name},

{creator_name} has assigned a new task to you on TaskFlow:

Title: {task_title}
Priority: {priority}
Due Date: {due_date}
Description: {description}

Open TaskFlow to review and track this task: {app_url}
        """

        cls.dispatch_email_async(to_email, subject, html_content, text_content)

    # --------------------------------------------------------------------------
    # Notification: Task Completed
    # --------------------------------------------------------------------------
    @classmethod
    def notify_task_completed(cls, task: Dict[str, Any], completer: Dict[str, Any], creator: Optional[Dict[str, Any]], assignee: Optional[Dict[str, Any]]):
        """
        Dispatches notification when a task is marked as completed.
        Sent to the task creator and assignee.
        """
        recipients = set()
        if creator and creator.get("email"):
            recipients.add(creator.get("email"))
        if assignee and assignee.get("email"):
            recipients.add(assignee.get("email"))

        if not recipients:
            return

        task_title = task.get("title", "Untitled Task")
        completer_name = completer.get("full_name") or completer.get("email", "A team member")
        app_url = Config.FRONTEND_URL
        subject = f"[TaskFlow] Completed: {task_title}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
            .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #047857 100%); padding: 28px 32px; color: #ffffff; }}
            .brand {{ font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #d1fae5; }}
            .header h1 {{ margin: 8px 0 0 0; font-size: 20px; font-weight: 600; color: #ffffff; }}
            .body {{ padding: 32px; }}
            .task-card {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .badge {{ display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; background: #10b981; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #10b981; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 24px; }}
            .footer {{ padding: 20px 32px; background: #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">TaskFlow Notifications</div>
              <h1>Task Marked as Completed</h1>
            </div>
            <div class="body">
              <p>Great news! The following task has been marked as <strong>Completed</strong> by <strong>{completer_name}</strong>:</p>
              
              <div class="task-card">
                <div style="margin-bottom: 8px;">
                  <span class="badge">&check; COMPLETED</span>
                </div>
                <h2 style="margin: 8px 0; font-size: 18px; color: #065f46;">{task_title}</h2>
                <p style="margin: 0; color: #047857; font-size: 14px;">Completed by: {completer_name}</p>
              </div>

              <a href="{app_url}" class="button">View Dashboard &rarr;</a>
            </div>
            <div class="footer">
              This is an automated notification from TaskFlow. Please do not reply directly to this email.
            </div>
          </div>
        </body>
        </html>
        """

        text_content = f"""
Hello,

The following task has been marked as COMPLETED by {completer_name}:

Task: {task_title}
Status: Completed

Open TaskFlow: {app_url}
        """

        for recipient_email in recipients:
            cls.dispatch_email_async(recipient_email, subject, html_content, text_content)
