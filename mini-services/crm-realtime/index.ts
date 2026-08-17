import { createServer, IncomingMessage } from 'http'
import { Server } from 'socket.io'

// ─── Socket.io server (port 3003) — for client connections via Caddy ─────────
const socketHttpServer = createServer((req, res) => {
  // socket.io will handle its own protocol; for other requests return 404
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found — use socket.io client')
})

const io = new Server(socketHttpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── HTTP broadcast server (port 3004) — for Next.js API routes ─────────────
const broadcastServer = createServer((req: IncomingMessage, res: any) => {
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

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
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

// ─── Start both servers ─────────────────────────────────────────────────────
const SOCKET_PORT = 3003
const BROADCAST_PORT = 3004

socketHttpServer.listen(SOCKET_PORT, () => {
  console.log(`[CRM Realtime] Socket.io server on port ${SOCKET_PORT} (for client connections via Caddy)`)
})

broadcastServer.listen(BROADCAST_PORT, () => {
  console.log(`[CRM Realtime] Broadcast HTTP server on port ${BROADCAST_PORT} (for Next.js API routes)`)
  console.log(`[CRM Realtime] Health: http://localhost:${BROADCAST_PORT}/health`)
  console.log(`[CRM Realtime] Broadcast: POST http://localhost:${BROADCAST_PORT}/broadcast`)
})
