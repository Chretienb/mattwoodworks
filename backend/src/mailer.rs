//! Optional SMTP email notifier.
//!
//! Set all five env vars to enable; if any is missing the mailer silently does nothing.
//!   SMTP_HOST      e.g. smtp.gmail.com
//!   SMTP_PORT      e.g. 587  (STARTTLS) or 465 (TLS)
//!   SMTP_USER      e.g. youraddress@gmail.com
//!   SMTP_PASS      App password (Gmail: create one under Google Account → Security)
//!   SMTP_FROM      Display name + address, e.g. "Matt Wood Works <youraddress@gmail.com>"
//!   ADMIN_NOTIFY_EMAIL  Where to send lead notifications, e.g. mathew@example.com

use lettre::{
    message::{header::ContentType, Mailbox},
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};

#[derive(Clone)]
pub struct Mailer {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
    to: Mailbox,
}

impl Mailer {
    pub fn from_env() -> Option<Self> {
        let host = std::env::var("SMTP_HOST").ok()?;
        let port: u16 = std::env::var("SMTP_PORT")
            .ok()?
            .trim()
            .parse()
            .ok()?;
        let user = std::env::var("SMTP_USER").ok()?;
        let pass = std::env::var("SMTP_PASS").ok()?;
        let from_str = std::env::var("SMTP_FROM").ok()?;
        let to_str = std::env::var("ADMIN_NOTIFY_EMAIL").ok()?;

        if host.is_empty() || user.is_empty() || pass.is_empty() || from_str.is_empty() || to_str.is_empty() {
            return None;
        }

        let from: Mailbox = from_str.parse().ok()?;
        let to: Mailbox = to_str.parse().ok()?;

        let creds = Credentials::new(user, pass);

        let transport = if port == 465 {
            AsyncSmtpTransport::<Tokio1Executor>::relay(&host)
                .ok()?
                .credentials(creds)
                .build()
        } else {
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&host)
                .ok()?
                .port(port)
                .credentials(creds)
                .build()
        };

        Some(Self { transport, from, to })
    }

    pub async fn send_estimate_notification(
        &self,
        first_name: &str,
        last_name: &str,
        email: &str,
        phone: &str,
        project_type: &str,
        message: &str,
    ) {
        let subject = format!(
            "New estimate request from {} {}",
            first_name, last_name
        );

        let body = format!(
            "You have a new estimate request.\n\
            \n\
            Name:         {} {}\n\
            Email:        {}\n\
            Phone:        {}\n\
            Project type: {}\n\
            \n\
            Message:\n\
            {}\n\
            \n\
            — Matt Wood Works website",
            first_name, last_name, email, phone, project_type, message
        );

        let email_msg = match Message::builder()
            .from(self.from.clone())
            .to(self.to.clone())
            .subject(&subject)
            .header(ContentType::TEXT_PLAIN)
            .body(body)
        {
            Ok(m) => m,
            Err(e) => {
                eprintln!("[mailer] failed to build email: {e}");
                return;
            }
        };

        match self.transport.send(email_msg).await {
            Ok(_) => eprintln!("[mailer] estimate notification sent to {}", self.to),
            Err(e) => eprintln!("[mailer] failed to send email: {e}"),
        }
    }
}
