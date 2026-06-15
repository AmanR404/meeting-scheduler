# Database Design — ER Diagram

MongoDB (document) collections and their relationships. The diagram renders on GitHub.

```mermaid
erDiagram
    USER ||--o{ MEETING : "organizes"
    USER }o--o{ MEETING : "participates in"
    MEETING ||--o{ ATTENDANCE : "tracks"
    USER ||--o{ ATTENDANCE : "has"
    USER ||--o{ NOTIFICATION : "receives"
    MEETING ||--o{ NOTIFICATION : "generates"
    USER ||--o{ AUDITLOG : "performs"

    USER {
        ObjectId _id
        string googleId UK
        string name
        string email UK
        string profileImage
        string role "teacher | candidate"
        string googleAccessToken "select:false"
        string googleRefreshToken "select:false"
        date   googleTokenExpiry
        array  workingHours "day, start, end, enabled"
        array  holidays
        array  blockedSlots "start, end, reason"
        string timezone
        date   lastLoginAt
        date   createdAt
        date   updatedAt
    }

    MEETING {
        ObjectId _id
        string title
        string description
        string notes
        string type "interview | training | ..."
        string status "scheduled | completed | cancelled"
        ObjectId organizer FK
        array  participants FK
        date   startTime
        date   endTime
        string timezone
        object recurrence "frequency, interval, until, count"
        ObjectId seriesId FK
        bool   isRecurringInstance
        string googleEventId
        string googleCalendarId
        string meetLink
        date   cancelledAt
        string cancelReason
        date   createdAt
        date   updatedAt
    }

    ATTENDANCE {
        ObjectId _id
        ObjectId meeting FK
        ObjectId participant FK
        date   joinTime
        date   leaveTime
        number durationMinutes
        string status "present | late | left_early | absent"
        string source "workspace | app | manual"
        date   createdAt
        date   updatedAt
    }

    NOTIFICATION {
        ObjectId _id
        ObjectId recipient FK
        ObjectId meeting FK
        string type "invitation | reminder | reschedule | cancellation"
        string status "pending | sent | failed"
        string channel "email"
        string subject
        string reminderOffset "24h | 1h | 15m"
        date   scheduledFor
        date   sentAt
        string error
        date   createdAt
        date   updatedAt
    }

    AUDITLOG {
        ObjectId _id
        ObjectId actor FK
        string action "user_login | meeting_create | ..."
        string targetType
        ObjectId targetId
        object metadata
        string ipAddress
        string userAgent
        date   createdAt
    }
```

## Notes

- **Unique indexes:** `User.googleId`, `User.email`, and `Attendance(meeting, participant)` (one record per participant per meeting).
- **Compound indexes:** `Meeting(organizer, startTime)`, `Meeting(participants, startTime)`, `Meeting(status, startTime)` for the dashboard and list queries.
- **Recurring meetings** are expanded into one document per occurrence, linked by `seriesId`; each occurrence has its own Google event and Meet link.
- **Google tokens** on `User` are stored with `select:false` and stripped from JSON responses.
