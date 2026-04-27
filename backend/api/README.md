## API Endpoints

### REST API

#### GET

* `/health`
  Empty function, used for docker health

#### POST

* `/api/heartbeat`
  Refresh the TTL of a connected user

* `/api/scores`
  Submit a score update

* `/api/connection`
  Claim a username and receive a token

---

#### DELETE

* `/api/connection/{username}/{token}`
  Release a username / close a session

---

### SSE (Server-Sent Events)

* `/api/events/ranking`
  Stream live ranking updates (score deltas)

* `/api/events/connections`
  Stream connection / disconnection events

