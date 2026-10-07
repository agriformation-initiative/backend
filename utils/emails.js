const { sendMail } = require('./mailer');

const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminInbox = () => process.env.ADMIN_NOTIFY_EMAIL || process.env.ZOHO_SMTP_USER;

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const paragraphs = (text) =>
  esc(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

const button = (href, label) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#2d5e29;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;display:inline-block">${esc(label)}</a></p>`;

const layout = (heading, body) => `<!doctype html>
<html><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#292524">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1b3a1a">AgroNext</p>
    <div style="background:#ffffff;border-radius:10px;padding:28px;line-height:1.6;font-size:15px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#1c1917">${esc(heading)}</h1>
      ${body}
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#78716c">AgroNext Agricultural Development Initiative</p>
  </div>
</body></html>`;

const details = (rows) =>
  `<table style="border-collapse:collapse;margin:0 0 14px">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 16px 3px 0;color:#78716c;vertical-align:top">${esc(k)}</td><td style="padding:3px 0">${esc(v)}</td></tr>`
    )
    .join('')}</table>`;

// ── To the team ──────────────────────────────────────────────────────────────

const notifyTeam = (subject, heading, rows, message, replyTo) =>
  sendMail({
    to: adminInbox(),
    subject,
    replyTo,
    html: layout(heading, details(rows) + (message ? paragraphs(message) : '')),
    text: `${heading}\n\n${rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${message || ''}`,
  });

const inquiryReceived = (inquiry) => {
  const label = { contact: 'Message', school: 'School request', partner: 'Partnership enquiry' }[inquiry.type];
  return notifyTeam(
    `${label}: ${inquiry.subject || inquiry.organization || inquiry.name}`,
    `New ${label.toLowerCase()}`,
    [
      ['Name', inquiry.name],
      ['Email', inquiry.email],
      ['Phone', inquiry.phone],
      ['Organisation', inquiry.organization],
      ['Location', inquiry.location],
      ['Students', inquiry.studentCount],
      ['Subject', inquiry.subject],
    ],
    inquiry.message,
    inquiry.email
  );
};

const volunteerApplicationReceived = (application) =>
  notifyTeam(
    `Volunteer application: ${application.fullName}`,
    'New volunteer application',
    [
      ['Name', application.fullName],
      ['Email', application.email],
      ['Role', application.preferredRole],
    ],
    application.aboutYourself,
    application.email
  );

const callApplicationReceived = (call, application) =>
  notifyTeam(
    `Volunteer call application: ${call.title}`,
    `New application for "${call.title}"`,
    [
      ['Name', application.fullName],
      ['Email', application.email],
      ['Phone', application.phoneNumber],
    ],
    application.message,
    application.email
  );

// ── To the person who wrote in ───────────────────────────────────────────────

const acknowledge = (to, name, what) =>
  sendMail({
    to,
    subject: 'We have received your message',
    html: layout(
      `Thank you, ${name.split(' ')[0]}`,
      paragraphs(`We have received your ${what} and a member of the AgroNext team will reply by email.\n\nIf you need to add anything, just reply to this message.`)
    ),
    text: `Thank you, ${name}. We have received your ${what} and will reply by email.`,
  });

const applicationAccepted = (application, setPasswordToken) => {
  const link = `${frontendUrl()}/reset-password?token=${setPasswordToken}&welcome=1`;
  return sendMail({
    to: application.email,
    subject: 'Welcome to AgroNext. Your application was accepted',
    html: layout(
      `Welcome, ${application.fullName.split(' ')[0]}`,
      paragraphs('Your volunteer application has been accepted. We are glad to have you.\n\nChoose a password to open your volunteer account. The link works for 7 days.') +
        button(link, 'Set your password') +
        paragraphs(`If the button does not work, copy this link into your browser:\n${link}`)
    ),
    text: `Your AgroNext volunteer application was accepted. Set your password here (valid 7 days): ${link}`,
  });
};

const applicationRejected = (application) =>
  sendMail({
    to: application.email,
    subject: 'Your AgroNext volunteer application',
    html: layout(
      'Thank you for applying',
      paragraphs(`Hello ${application.fullName.split(' ')[0]},\n\nThank you for your interest in volunteering with AgroNext. We are not able to offer you a place at this time. New opportunities are posted on our volunteer page, and you are welcome to apply again.`)
    ),
    text: 'Thank you for applying to volunteer with AgroNext. We are not able to offer you a place at this time. You are welcome to apply again for future opportunities.',
  });

const callApplicationDecision = (call, application, status) =>
  sendMail({
    to: application.email,
    subject: status === 'accepted' ? `You are in: ${call.title}` : `Your application: ${call.title}`,
    html: layout(
      status === 'accepted' ? 'Your application was accepted' : 'Thank you for applying',
      paragraphs(
        status === 'accepted'
          ? `Hello ${application.fullName.split(' ')[0]},\n\nYou have been accepted as a volunteer for "${call.title}". We will be in touch with the details before the event.`
          : `Hello ${application.fullName.split(' ')[0]},\n\nThank you for applying to "${call.title}". We were not able to offer you a place this time, and we hope you will apply for future opportunities.`
      )
    ),
    text:
      status === 'accepted'
        ? `You have been accepted as a volunteer for "${call.title}". We will be in touch with details.`
        : `Thank you for applying to "${call.title}". We were not able to offer you a place this time.`,
  });

const passwordReset = (user, token) => {
  const link = `${frontendUrl()}/reset-password?token=${token}`;
  return sendMail({
    to: user.email,
    subject: 'Reset your AgroNext password',
    html: layout(
      'Reset your password',
      paragraphs('We received a request to reset your password. The link works for 1 hour.') +
        button(link, 'Choose a new password') +
        paragraphs('If you did not ask for this, you can ignore this email. Your password has not changed.')
    ),
    text: `Reset your AgroNext password (valid 1 hour): ${link}`,
  });
};

module.exports = {
  inquiryReceived,
  volunteerApplicationReceived,
  callApplicationReceived,
  acknowledge,
  applicationAccepted,
  applicationRejected,
  callApplicationDecision,
  passwordReset,
};
