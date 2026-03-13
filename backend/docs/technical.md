# QuickPoll Technical Reference

## Technology Stack
- **Language:** Java 21
- **Framework:** Spring Boot 3.2.0
- **Database:** PostgreSQL 15+
- **ORM:** Hibernate (Spring Data JPA)
- **Security:** Spring Security with JWT
- **Build Tool:** Maven

## Project Structure
`src/main/java/com/amalitech/quickpoll/`
- `config/`: Application configuration (Security, JWT, CORS, OpenAPI).
- `controller/`: REST endpoints exposing the API.
- `dto/`: Data Transfer Objects for API requests and responses. Follows `*Request` and `*Response` naming conventions.
- `errorhandlers/`: Custom exception classes and global `@ControllerAdvice` (`CustomExceptionHandler.java`).
- `mapper/`: MapStruct interfaces translating Entities to DTOs.
- `model/`: JPA Entities mapping to the database schema.
  - `model/analytics/`: `@Immutable` read-only entities mapped to the OLAP tables.
  - `model/enums/`: Enums for Roles, Poll Status, etc.
- `repository/`: Spring Data JPA Interfaces.
- `service/`: Core business logic and validation.

## Entity Relational Model (Core OLTP)
1. **User (users):** The central identity record. Stores email, encrypted password, role (`USER`, `ADMIN`), and associated department.
2. **Department (departments):** Logical grouping of users.
3. **Poll (polls):** Created by a User. Contains question, description, expiration timestamp, active status, max selections, and anonymity toggle. 
4. **PollOption (poll_options):** Possible answers mapped to a Poll (`poll_id`).
5. **PollInvite (poll_invites):** Explicit entitlements connecting a user (via email) to a poll. Enforces private casting.
6. **Vote (votes):** A transactional record combining a `user_id`, `poll_id`, and `option_id`. The user must exist in `poll_invites` (unless public) and must not have voted previously.

## Analytics Model (OLAP)
To maintain high performance querying on the dashboard, the application utilizes pre-aggregated tables maintained by database triggers:
1. `analytics_poll_summary`: Aggregates total votes and unique voters per poll. Used by `/api/dashboard/summary`.
2. `analytics_option_breakdown`: Stores the real-time vote count and percentage distribution for each option. Used by `/api/polls/{id}/results`.
3. `analytics_votes_timeseries`: Stores vote occurrences bucketed into hourly windows. Used in time-series graphs `/api/polls/{id}/results/timeseries`.
4. `analytics_user_participation`: Maintains a count of polls created and votes cast for the global admin leaderboard `/api/dashboard/top-users`.

## Key Component Behaviors

### Access Control Let (\`SecurityContext\`)
- `@PreAuthorize("hasRole('ADMIN')")` secures administrative endpoints (e.g., retrieving all users or top users).
- Explicit ownership checks happen in the service layer: A user attempting to close a poll must match `poll.getCreator().getId()` or be an `ADMIN`.
- Dashboard views dynamically scope database queries (e.g., `creator_id = ?`) to safely return a filtered view of data without throwing aggressive `AccessDeniedException` variants for valid users.

### Error Handling
The `CustomExceptionHandler` catches standard domain exceptions (`ResourceNotFoundException`, `AlreadyVotedException`, `PollAlreadyClosedException`, `AccessDeniedException`) and standardizes the output as an `ErrorResponse`:
```json
{
  "timestamp": "2026-03-12T17:50:00",
  "status": 404,
  "error": "Not Found",
  "message": "Poll not found"
}
```
