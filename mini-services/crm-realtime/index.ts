import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server } from 'socket.io'

// Render (and most PaaS platforms) expose exactly ONE external port per
// service, injected as process.env.PORT. This service used to hardcode two
// separate ports (3003 for Socket.IO, 3004 for health/broadcast) which only
// worked behind the Caddy reverse proxy in this repo's single-container
// deployment path. On a standalone Render web service, only the first port
// the process opens is reachable externally — so /health and /broadcast were
// silently unroutable, and requests landed on the Socket.IO engine instead
// (hence the "Transport unknown" engine.io error on GET /health).
//
// Fix: run ONE http server on PORT. Socket.IO attaches to it on its default
// path (/socket.io/) so plain HTTP requests to /health and /broadcast are
// untouched by the engine.io protocol handler and reach our own routes.
const PORT = Number(process.env.PORT) || 3003

const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'crm-realtime', connections: io.engine.clientsCount }))
    return
  }

  if (req.url === '/broadcast' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const event = JSON.parse(body)
        io.emit('crm:event', { ...event, timestamp: new Date().toISOString() })
        if (event.entity) {
          io.to(`entity:${event.entity}`).emit(`crm:${event.entity.toLowerCase()}`, { ...event, timestamp: new Date().toISOString() })
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, broadcast: true, clients: io.engine.clientsCount }))
        console.log(`[CRM Realtime] Broadcast ${event.type} ${event.entity} — ${event.summary ?? ''} (to ${io.engine.clientsCount} clients)`)
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // Anything else falls through here — Socket.IO's own protocol traffic
  // is intercepted before this handler runs, since it lives on /socket.io/.
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

// Default path (/socket.io/) — NOT '/', so plain HTTP requests to /health
// and /broadcast are never swallowed by the engine.io protocol handler.
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Socket.io event handlers ───────────────────────────────────────────────
let connectionCount = 0

io.on('connection', (socket) => {
  connectionCount++
  console.log(`[CRM Realtime] Client connected (${socket.id}). Total: ${connectionCount}`)

  socket.emit('connected', {
    message: 'Connected to Nexus CRM Realtime',
    timestamp: new Date().toISOString(),
    clientId: socket.id,
  })

  socket.on('subscribe', (channel: string) => {
    if (typeof channel === 'string') socket.join(`entity:${channel}`)
  })

  socket.on('unsubscribe', (channel: string) => {
    if (typeof channel === 'string') socket.leave(`entity:${channel}`)
  })

  socket.on('disconnect', () => {
    connectionCount--
    console.log(`[CRM Realtime] Client disconnected (${socket.id}). Total: ${connectionCount}`)
  })
})

// ─── Start the single server ────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[CRM Realtime] Listening on port ${PORT}`)
  console.log(`[CRM Realtime] Socket.IO path: /socket.io/`)
  console.log(`[CRM Realtime] Health: http://localhost:${PORT}/health`)
  console.log(`[CRM Realtime] Broadcast: POST http://localhost:${PORT}/broadcast`)
})
