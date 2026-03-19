# Tallink Trenn v2 - RTDB Schema Specification (Frozen)

This document defines the frozen Realtime Database (RTDB) JSON tree design for Phase 2.

Core Rules:
- No Arrays: Use maps/objects with stable string IDs as keys.
- Stable IDs: Never use names as keys.
- Time/Date: Dates are YYYY-MM-DD, times are HH:MM (Europe/Tallinn).
- Sport must exist on BOTH sessionDefinitions and sessionInstances.
- Deterministic recurring instance ID: YYYY-MM-DD__definitionId

---

## JSON Skeleton

```json
{
  "users": {
    "user_uid_1": {
      "email": "coach@example.com",
      "displayName": "Coach Name",
      "role": "coach",
      "playerId": null,
      "createdAt": "2026-02-23T14:00:00Z"
    }
  },

  // Note: playerId is populated during invite acceptance. Null for admin, coach, and parent roles. Required for player role.

  "players": {
    "player_id_1": {
      "firstName": "Sass",
      "lastName": "Example",
      "birthYear": 2012,
      "fitnessGroup": "A",
      "wtn": 33.33,
      "active": true,
      "createdAt": "2026-02-23T14:00:00Z"
    }
  },

  "parentLinks": {
    "parent_uid_1": {
      "player_id_1": true,
      "player_id_2": true
    }
  },

  "coachPermissions": {
    "coach_uid_1": {
      "global": true
    },
    "coach_uid_2": {
      "global": false,
      "sessionDefinitions": {
        "def_weekly_tuesday_tennis": true
      }
    }
  },

  "sessionDefinitions": {
    "def_weekly_tuesday_tennis": {
      "sport": "tennis",
      "weekday": 2,
      "startTime": "14:30",
      "endTime": "16:00",
      "capacity": 8,
      "assignedCoachIds": {
        "coach_uid_1": true,
        "coach_uid_2": true
      },
      "active": true,
      "createdAt": "2026-02-23T14:00:00Z",
      "createdBy": "admin_uid_1"
    }
  },

  "recurringEnrollments": {
    "def_weekly_tuesday_tennis": {
      "player_id_1": {
        "active": true,
        "effectiveFrom": "2026-01-01",
        "effectiveTo": null
      }
    }
  },

  "recurringChanges": {
    "def_weekly_tuesday_tennis": {
      "change_id_1": {
        "playerId": "player_id_3",
        "action": "add",
        "effectiveFrom": "2026-03-01",
        "effectiveTo": null,
        "createdBy": "admin_uid_1",
        "createdAt": "2026-02-23T14:00:00Z"
      }
    }
  },

  "sessionInstances": {
    "2026-03-03__def_weekly_tuesday_tennis": {
      "definitionId": "def_weekly_tuesday_tennis",
      "date": "2026-03-03",
      "startTime": "14:30",
      "endTime": "16:00",
      "sport": "tennis",
      "capacity": 8,
      "assignedCoachIds": {
        "coach_uid_1": true
      },
      "status": "scheduled",
      "createdAt": "2026-02-23T14:00:00Z",
      "createdBy": "system"
    },

    "inst_oneoff_generated_key": {
      "definitionId": null,
      "date": "2026-03-05",
      "startTime": "10:00",
      "endTime": "11:30",
      "sport": "fitness",
      "capacity": 6,
      "assignedCoachIds": {
        "coach_uid_2": true
      },
      "status": "scheduled",
      "createdAt": "2026-02-23T14:00:00Z",
      "createdBy": "admin_uid_1"
    }
  },

  "rosters": {
    "2026-03-03__def_weekly_tuesday_tennis": {
      "player_id_1": {
        "source": "recurring",
        "addedBy": "system",
        "addedAt": "2026-02-23T14:00:00Z",
        "walkIn": false,
        "removedByCoach": false
      }
    }
  },

  "attendance": {
    "2026-03-03__def_weekly_tuesday_tennis": {
      "player_id_1": {
        "preStatus": "kinnitatud",
        "realStatus": "kohal",
        "lateCancel": false,
        "markedBy": "coach_uid_1",
        "markedAt": "2026-03-03T14:35:00Z"
      },
      "player_id_2": {
        "preStatus": "eiOsale",
        "realStatus": null,
        "lateCancel": false,
        "markedBy": null,
        "markedAt": null
      }
    }
  },

  "enrollmentRequests": {
    "inst_oneoff_generated_key": {
      "request_id_1": {
        "playerId": "player_id_2",
        "requestedByUserId": "parent_uid_1",
        "status": "pending",
        "createdAt": "2026-03-01T12:00:00Z",
        "decidedByUserId": null,
        "decidedAt": null,
        "note": null
      }
    }
  },

  "feedback": {
    "2026-03-03__def_weekly_tuesday_tennis": {
      "player_id_1": {
        "playerEffort": 4,
        "coachInvolvement": 5,
        "playerSubmittedAt": "2026-03-03T16:00:00Z",
        "coachEffort": 5,
        "coachComment": "Great intensity",
        "coachSubmittedAt": "2026-03-03T16:30:00Z",
        "editableUntil": "2026-03-10T16:00:00Z"
      }
    }
  },

  "announcements": {
    "2026-03-03__def_weekly_tuesday_tennis": {
      "announcement_id_1": {
        "text": "Location changed to Court 3",
        "createdAt": "2026-02-23T14:00:00Z",
        "createdBy": "admin_uid_1"
      }
    }
  },

  "adminBanner": {
    "enabled": true,
    "text": "System maintenance tonight at 23:00.",
    "updatedAt": 1708693200000,
    "updatedBy": "admin_uid_1"
  }
}
```

---

## Relationships Summary

- sessionDefinitions are templates.
- sessionInstances are generated 30 days ahead using definitions + recurringEnrollments + recurringChanges.
- rosters/{instanceId}/{playerId} contains metadata and source of enrollment. `removedByCoach` = true means coach removed this recurring player from this specific instance, preventing engine re-add.
- attendance/{instanceId}/{playerId} stores preStatus, realStatus, and lateCancel.
- enrollmentRequests are flat and linked via sessionInstanceId.
- feedback is nested by sessionInstanceId then playerId.
- announcements are tied to sessionInstanceId.
- adminBanner is a single global banner.

---

## Attendance Node Shape (Frozen)
### `attendance/{instanceId}/{playerId}`
**Fields:**
- `preStatus`: "kinnitatud" | "eiOsale" | null  
  *Set by player/parent. Logs intent to attend. "Ootel" is derived from null. Locked 1h before start.*
- `realStatus`: "kohal" | "hilines" | "puudus" | "vabastatud" | null  
  *Set ONLY by coach/admin. Actual attendance.*
- `lateCancel`: boolean  
  *Flag = true ONLY when realStatus becomes "puudus" while preStatus was "kinnitatud". Computed server-side (or securely on client prior to write).*
- `markedBy`: uid | null
  *The Auth UID of the coach or admin who last modified the realStatus.*
- `markedAt`: ISO timestamp | null
  *The timestamp when realStatus was last modified.*

**Lock rule:**
- `preStatus` locks 60 minutes before session start time.
- Lock applies to: player and parent roles only. Admin and coach may override preStatus at any time.
- Lock computed via `sessionInstances/{instanceId}.date` + `startTime` in Europe/Tallinn timezone (`getTallinnNow() >= sessionStart - 60 minutes`).

**Write permissions:**
- `preStatus`: player, parent (before lock), coach, admin (anytime)
- `realStatus`: coach, admin only
- `lateCancel`: computed on realStatus write (true when realStatus written as "puudus" AND preStatus was "kinnitatud"), never manual.

---

## Ambiguities (Explicit)

1. PreStatus lock enforcement will be computed in UI + Security Rules.
2. One-off coach permission logic relies on assignedCoachIds in sessionInstances.

---

## Schema Decisions (Frozen v1.0)

1. **parentLinks direction**: We use `parentLinks/{parentUid}/{playerId}: true` to allow fast parent login queries ("which players does this parent manage?").
2. **recurringEnrollments effective dating**: Each enrollment supports `effectiveFrom` and `effectiveTo` to allow mid-season schedule changes without rewriting historical instances.
3. **enrollmentRequests keying**: Requests are nested under `enrollmentRequests/{instanceId}/{requestId}` to allow efficient per-instance querying in Realtime Database.

4. **lateCancel trigger and storage**: `lateCancel` is stored as a boolean on the attendance record. It is set to `true` only when a coach or admin writes `realStatus: "Puudus"`. It is never set by player or parent action. Default value is `false`.

5. **Coach permission resolution for sessionInstances**: A coach has permission for a `sessionInstance` if:
   - (a) `coachPermissions/{uid}/global` is `true`, OR
   - (b) the instance's `definitionId` is listed in `coachPermissions/{uid}/sessionDefinitions`, OR
   - (c) the coach's `uid` appears in the instance's `assignedCoachIds` map.

   These rules are considered frozen and must be enforced consistently in both UI logic and Firebase Security Rules.

This document is now considered Frozen Schema v1.0. All future development chunks must strictly conform to this structure unless an explicit version increment is agreed upon.