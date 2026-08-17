import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = Number(process.env.PORT) || 3003

const httpServer = createServer((req, res) => {
  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'crm-realtime',
        connections: io.engine.clientsCount,
      })
    )
    return
  }

  // Broadcast endpoint
  if (req.url === '/broadcast' && req.method === 'POST') {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const event = JSON.parse(body)

        const timestamp = new Date().toISOString()

        io.emit('crm:event', {
          ...event,
          timestamp,
        })

        if (event.entity) {
          io.to(`entity:${event.entity}`).emit(
            `crm:${event.entity.toLowerCase()}`,
            {
              ...event,
              timestamp,
            }
          )
        }

        res.writeHead(200, {
          'Content-Type': 'application/json',
        })

        res.end(
          JSON.stringify({
            success: true,
            broadcast: true,
            clients: io.engine.clientsCount,
          })
        )

        console.log(
          `[CRM Realtime] Broadcast ${event.type ?? ''} ${
            event.entity ?? ''
          } — ${event.summary ?? ''} (to ${
            io.engine.clientsCount
          } clients)`
        )
      } catch {
        res.writeHead(400, {
          'Content-Type': 'application/json',
        })

        res.end(
          JSON.stringify({
            error: 'Invalid JSON',
          })
        )
      }
    })

    return
  }

  // Socket.IO handles its own requests
  if (req.url?.startsWith('/socket.io/')) {
    return
  }

  res.writeHead(404, {
    'Content-Type': 'text/plain',
  })

  res.end('Not Found')
})

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },

  pingTimeout: 60000,
  pingInterval: 25000,
})

let connectionCount = 0

io.on('connection', (socket) => {
  connectionCount++

  console.log(
    `[CRM Realtime] Client connected (${socket.id}). Total: ${connectionCount}`
  )

  socket.emit('connected', {
    message: 'Connected to Nexus CRM Realtime',
    timestamp: new Date().toISOString(),
    clientId: socket.id,
  })

  socket.on('subscribe', (channel: string) => {
    if (typeof channel === 'string') {
      socket.join(`entity:${channel}`)

      console.log(
        `[CRM Realtime] ${socket.id} subscribed to ${channel}`
      )
    }
  })

  socket.on('unsubscribe', (channel: string) => {
    if (typeof channel === 'string') {
      socket.leave(`entity:${channel}`)
    }
  })

  socket.on('disconnect', () => {
    connectionCount--

    console.log(
      `[CRM Realtime] Client disconnected (${socket.id}). Total: ${connectionCount}`
    )
  })
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[CRM Realtime] Server running on port ${PORT}`
  )

  console.log(
    `[CRM Realtime] Health: /health`
  )

  console.log(
    `[CRM Realtime] Broadcast: POST /broadcast`
  )

  console.log(
    `[CRM Realtime] Socket.IO: /socket.io/`
  )
})
