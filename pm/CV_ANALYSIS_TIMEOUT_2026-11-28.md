# CV analysis timeout

The demo proxy uses the nginx default 60-second upstream read timeout for
`/api/`. CV analysis previously could make two 45-second attempts for each
structured prompt, with another prompt for schema repair and a separate feedback
stage. The route can therefore outlast the proxy.

The CV analysis route now uses a shared 40-second AI budget and a 50-second
route timer. AI attempts, response bodies, retry waits and repair share the AI
signal; exhausted AI falls back to basic extraction or omits feedback. The
route timer returns a 503 JSON message if upload processing, parsing or history
persistence stalls. Other AI routes retain their existing timeout behavior.

These are cooperative deadlines, not hard execution limits: synchronous work
that blocks Node's event loop can delay the timer, and parsing or a database
write already underway may continue after a timeout response. In particular a
late history insert can complete even if the client saw 503; a retry may create
another history record. Cancellation of database work and idempotent retries
would require a separate design. A proxy deadline also cannot be guaranteed
if delay occurs before the request reaches the application.

The route-level tests use synthetic uploads, a mocked parser and database, and
mocked provider responses, with shortened timers. They cover stuck extraction,
feedback, successful retry and repair, stalled response bodies and retry wait,
basic fallback, late parsing and stalled persistence; no provider requests are
made. Existing synthetic upload and AI tests are also run offline.
