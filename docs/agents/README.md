# KE Console Agent Team

Multi-agent orchestration for executing the 23-issue KE backlog (#87-#109).

## Agent Roles

| File                   | Role              | Scope                                                       |
| ---------------------- | ----------------- | ----------------------------------------------------------- |
| `orchestrator.md`      | Orchestrator      | Wave sequencing, shared file coordination, merge management |
| `product-manager.md`   | Product Manager   | PRD validation, acceptance criteria verification            |
| `api-engineer-a.md`    | API Engineer A    | Track 1 (Foundation) + Track 2 (Expense Core) backend       |
| `api-engineer-b.md`    | API Engineer B    | Track 3 (Disputes, Recurring, Notifications) backend        |
| `frontend-engineer.md` | Frontend Engineer | All UI pages, components, API client extensions             |
| `qa-engineer.md`       | QA Engineer       | Tests, edge cases, integration testing                      |

## Execution Waves

| Wave             | Issues                       | Dependencies             |
| ---------------- | ---------------------------- | ------------------------ |
| Wave 1 (P0s)     | #87, #88, #90, #92, #93, #96 | None - start immediately |
| Wave 2 (P1s)     | #89, #91, #94, #95, #97      | Blocked by Wave 1        |
| Wave 3 (Phase 2) | #98-#105                     | Blocked by Wave 2        |
| Wave 4 (Phase 3) | #106-#109                    | Blocked by Wave 3        |

## Wave Coordination Files

| File             | Purpose                                     |
| ---------------- | ------------------------------------------- |
| `wave-1-plan.md` | Wave 1 execution plan with file assignments |
| `wave-2-plan.md` | Wave 2 execution plan                       |
| `wave-3-plan.md` | Wave 3 execution plan                       |
| `wave-4-plan.md` | Wave 4 execution plan                       |

## Usage

Each agent prompt is designed to be loaded as context for a Claude Code session.
The orchestrator manages wave sequencing and conflict resolution.

```bash
# Example: Start an API Engineer A session for Wave 1
# Load the orchestrator.md + api-engineer-a.md + wave-1-plan.md as context
```

## Shared File Protocol

- `index.ts` - Append-only route registration
- `types.ts` - Append-only type definitions
- `api.ts` - Append-only function exports
- `calculations.ts` - READ-ONLY (changes require PM + QA approval)
- `migrations/` - Sequential numbering, reserved per wave
- `services/activity.ts` - Append-only event handlers
