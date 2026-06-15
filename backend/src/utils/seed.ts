/**
 * Seed script: creates a teacher, a few candidates, and a sample meeting for
 * local development. Idempotent (upserts by email). Run with `npm run seed`.
 *
 * Note: seeded meetings have no real Google Calendar event/Meet link — they are
 * for exercising the dashboard, lists, and reports without Google.
 */
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Meeting } from '../models/Meeting';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UserRole, MeetingType, MeetingStatus, RecurrenceFrequency } from '../types/enums';

async function upsertUser(email: string, name: string, role: UserRole) {
  return User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        googleId: `seed:${email}`,
        email,
        name,
        role,
        timezone: env.timezone,
        ...(role === UserRole.TEACHER
          ? {
              workingHours: [1, 2, 3, 4, 5].map((d) => ({
                dayOfWeek: d,
                startTime: '09:00',
                endTime: '18:00',
                enabled: true,
              })),
            }
          : {}),
      },
    },
    { upsert: true, new: true }
  );
}

async function seed() {
  await connectDatabase();

  const teacherEmail = env.teacherEmails[0] || env.google.workspaceAdminEmail || 'teacher@example.com';
  const teacher = await upsertUser(teacherEmail, 'Demo Teacher', UserRole.TEACHER);
  const c1 = await upsertUser('candidate1@example.com', 'Candidate One', UserRole.CANDIDATE);
  const c2 = await upsertUser('candidate2@example.com', 'Candidate Two', UserRole.CANDIDATE);

  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const existing = await Meeting.findOne({ organizer: teacher._id, title: 'Sample Interview (seeded)' });
  if (!existing) {
    await Meeting.create({
      title: 'Sample Interview (seeded)',
      description: 'Seeded sample meeting for local testing',
      type: MeetingType.INTERVIEW,
      status: MeetingStatus.SCHEDULED,
      organizer: teacher._id,
      participants: [c1._id, c2._id],
      startTime: start,
      endTime: end,
      timezone: env.timezone,
      recurrence: { frequency: RecurrenceFrequency.NONE, interval: 1 },
      meetLink: 'https://meet.google.com/seed-demo-link',
    });
  }

  logger.info(`✅ Seed complete. Teacher: ${teacherEmail}, candidates: 2, sample meeting: 1`);
  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
