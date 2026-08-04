import { Injectable, Logger } from '@nestjs/common'
import { Response } from 'express'

@Injectable()
export class ChatEventsService {
  private readonly logger = new Logger(ChatEventsService.name)
  private readonly clients = new Map<string, Set<Response>>()

  subscribe(tenantId: string, res: Response): () => void {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    if (!this.clients.has(tenantId)) this.clients.set(tenantId, new Set())
    this.clients.get(tenantId)!.add(res)
    this.logger.log(`SSE connect tenant=${tenantId} total=${this.clients.get(tenantId)!.size}`)

    const keepAlive = setInterval(() => res.write(': ping\n\n'), 20000)

    return () => {
      clearInterval(keepAlive)
      this.clients.get(tenantId)?.delete(res)
      this.logger.log(`SSE disconnect tenant=${tenantId}`)
    }
  }

  emit(tenantId: string, event: string, data: unknown): void {
    const set = this.clients.get(tenantId)
    if (!set?.size) return
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const res of set) res.write(payload)
    this.logger.log(`SSE emit event=${event} tenant=${tenantId} clients=${set.size}`)
  }
}
