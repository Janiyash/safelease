import cron from 'node-cron';
import { format, addDays, startOfDay, isBefore, isEqual } from 'date-fns';
import { Property } from '../models/Property';
import { Payment }  from '../models/Payment';
import { User }     from '../models/User';
import { RentNotification } from '../models/RentNotification';

const GRACE_DAYS  = Number(process.env.OVERDUE_GRACE_DAYS       ?? 0);
const REMIND_DAYS = Number(process.env.RENT_REMINDER_DAYS_BEFORE ?? 5);
const DUE_DAY     = Number(process.env.RENT_DUE_DAY             ?? 1);

const log = (fn: string, msg: string, data?: object) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), fn, msg, ...data }));

// Email is optional — only runs when SMTP is configured
async function safeEmail(label: string, fn: () => Promise<void>) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;
  try { await fn(); }
  catch (err) { log(label, 'Email failed (non-fatal)', { error: String(err) }); }
}

async function pushNotification(userId: string, message: string, type: 'info'|'warning'|'success'|'error', link: string) {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: { notifications: { message, type, link, createdAt: new Date() } },
    });
  } catch (err) {
    log('pushNotification', 'Failed', { userId, error: String(err) });
  }
}

// ── 1. Generate monthly rent ──────────────────────────────────────────────────
export async function generateMonthlyRent(): Promise<{ created: number; skipped: number; total: number }> {
  const now     = new Date();
  const month   = format(now, 'yyyy-MM');
  const dueDate = new Date(now.getFullYear(), now.getMonth(), DUE_DAY, 12, 0, 0);

  log('generateMonthlyRent', 'Starting', { month });

  const properties = await Property.find({
    status: 'rented', isApproved: true,
    tenant: { $exists: true, $ne: null },
  }).populate<{ tenant: any; owner: any }>('tenant owner');

  let created = 0, skipped = 0;

  for (const prop of properties) {
    if (!prop.tenant?._id || !prop.owner?._id) { skipped++; continue; }

    const existing = await Payment.findOne({ property: prop._id, month, billType: 'rent' });
    if (existing) { skipped++; continue; }

    try {
      await Payment.create({
        property: prop._id, tenant: prop.tenant._id, owner: prop.owner._id,
        amount: prop.rent, dueDate, month, status: 'pending', billType: 'rent',
        notes: `Auto-generated rent for ${month}`,
      });

      await pushNotification(
        prop.tenant._id.toString(),
        `Rent of ₹${prop.rent.toLocaleString('en-IN')} due on ${format(dueDate, 'dd MMM yyyy')} for ${prop.title}`,
        'warning', '/tenant/payments',
      );

      safeEmail('generateMonthlyRent', async () => {
        const { sendRentReminderEmail } = await import('../utils/email');
        await sendRentReminderEmail(prop.tenant.email, prop.tenant.name, prop.title, prop.rent, format(dueDate, 'dd MMM yyyy'), 'new');
      });

      created++;
    } catch (err) {
      log('generateMonthlyRent', 'Failed for property', { property: prop.title, error: String(err) });
    }
  }

  log('generateMonthlyRent', 'Done', { month, created, skipped });
  return { created, skipped, total: properties.length };
}

// ── 2. Detect overdue payments ────────────────────────────────────────────────
export async function detectOverdue(): Promise<{ marked: number }> {
  const graceCutoff = startOfDay(addDays(new Date(), -GRACE_DAYS));
  log('detectOverdue', 'Starting', { graceCutoff });

  const pending = await Payment.find({ status: 'pending' })
    .populate<{ tenant: any; property: any; owner: any }>('tenant property owner');

  let marked = 0;

  for (const payment of pending) {
    if (!payment.tenant?._id) continue;
    const due = startOfDay(new Date(payment.dueDate));
    if (!isBefore(due, graceCutoff) && !isEqual(due, graceCutoff)) continue;

    try {
      payment.status = 'overdue';
      await payment.save();
      marked++;

      await pushNotification(
        payment.tenant._id.toString(),
        `⚠️ Overdue: ₹${payment.amount.toLocaleString('en-IN')} rent for ${payment.month} is past due.`,
        'error', '/tenant/payments',
      );

      if (payment.owner?._id) {
        await pushNotification(
          payment.owner._id.toString(),
          `Rent overdue: ${payment.tenant.name} — ₹${payment.amount.toLocaleString('en-IN')} for ${payment.month}`,
          'error', '/owner/payments',
        );
      }

      await RentNotification.findOneAndUpdate(
        { paymentId: payment._id, type: 'OVERDUE_ALERT' },
        { tenantId: payment.tenant._id, paymentId: payment._id, type: 'OVERDUE_ALERT',
          title: 'Rent Overdue', message: `Rent of ₹${payment.amount} for ${payment.month} is overdue`,
          status: 'SENT', sentAt: new Date() },
        { upsert: true, new: true },
      );

      safeEmail('detectOverdue', async () => {
        const { sendOverdueEmail } = await import('../utils/email');
        await sendOverdueEmail(payment.tenant.email, payment.tenant.name, payment.property?.title || 'your property', payment.amount, payment.month);
      });
    } catch (err) {
      log('detectOverdue', 'Failed', { paymentId: payment._id.toString(), error: String(err) });
    }
  }

  log('detectOverdue', 'Done', { marked });
  return { marked };
}

// ── 3. Send reminders ─────────────────────────────────────────────────────────
export async function sendReminders(): Promise<{ sent: number }> {
  const today       = startOfDay(new Date());
  const reminderDay = startOfDay(addDays(today, REMIND_DAYS));
  log('sendReminders', 'Starting');

  let sent = 0;

  for (const targetDate of [today, reminderDay]) {
    const payments = await Payment.find({
      status: 'pending',
      dueDate: { $gte: startOfDay(targetDate), $lt: addDays(startOfDay(targetDate), 1) },
    }).populate<{ tenant: any; property: any }>('tenant property');

    const label     = isEqual(targetDate, today) ? 'due_today' : `due_in_${REMIND_DAYS}d`;
    const notifType = isEqual(targetDate, today) ? 'DUE_TODAY_REMINDER' : 'UPCOMING_REMINDER';

    for (const payment of payments) {
      if (!payment.tenant?._id) continue;
      if (payment.remindersSent?.includes(label)) continue;

      try {
        const msg = isEqual(targetDate, today)
          ? `Today is due date: ₹${payment.amount.toLocaleString('en-IN')} rent for ${payment.month}. Pay now.`
          : `Reminder: ₹${payment.amount.toLocaleString('en-IN')} rent for ${payment.month} due in ${REMIND_DAYS} days.`;

        await pushNotification(payment.tenant._id.toString(), msg, 'warning', '/tenant/payments');
        await Payment.findByIdAndUpdate(payment._id, { $addToSet: { remindersSent: label } });

        await RentNotification.findOneAndUpdate(
          { paymentId: payment._id, type: notifType },
          { tenantId: payment.tenant._id, paymentId: payment._id, type: notifType,
            title: isEqual(targetDate, today) ? 'Rent Due Today' : 'Upcoming Reminder',
            message: msg, status: 'SENT', sentAt: new Date() },
          { upsert: true, new: true },
        );

        safeEmail('sendReminders', async () => {
          const { sendRentReminderEmail } = await import('../utils/email');
          await sendRentReminderEmail(
            payment.tenant.email, payment.tenant.name,
            payment.property?.title || 'your property', payment.amount,
            format(new Date(payment.dueDate), 'dd MMM yyyy'),
            isEqual(targetDate, today) ? 'due_today' : 'upcoming',
          );
        });

        sent++;
      } catch (err) {
        log('sendReminders', 'Failed', { paymentId: payment._id.toString(), error: String(err) });
      }
    }
  }

  log('sendReminders', 'Done', { sent });
  return { sent };
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
export function startRentCycleScheduler(): void {
  cron.schedule('0 6 1 * *', () => generateMonthlyRent().catch(err => log('cron', 'generateMonthlyRent crashed', { error: String(err) })),
    { timezone: process.env.TZ || 'Asia/Kolkata' });
  cron.schedule('0 7 * * *', () => detectOverdue().catch(err => log('cron', 'detectOverdue crashed', { error: String(err) })),
    { timezone: process.env.TZ || 'Asia/Kolkata' });
  cron.schedule('0 8 * * *', () => sendReminders().catch(err => log('cron', 'sendReminders crashed', { error: String(err) })),
    { timezone: process.env.TZ || 'Asia/Kolkata' });

  log('startRentCycleScheduler', 'All cron jobs registered');
}
