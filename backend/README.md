The backend is made up of 2 packages.

## API

Contains all the server-side logic:
- Rest API -> `src/routes`
- SSE handling -> `src/routes/events`

This is where request handling, authentication, and score updates live.

---

## Miniredis

This package contains the miniredis implementation used in the project.
