import { ParameterizedContext, Next } from 'koa'
import fetch from 'node-fetch'
import shajs = require('sha.js')
import { SIGNATURE_SECRET } from '../config'

export default function log() {
  return async (ctx: ParameterizedContext, next: Next) => {
    await next()
    if (ctx.method !== 'HEAD') {
      const token = shajs('sha256')
        .update(`${Math.floor(Date.now() / 600000)}${SIGNATURE_SECRET}`)
        .digest('hex')
      await fetch(`https://hong97.ltd/log/api/log?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: 'sso',
          content: {
            url: ctx.url,
            request: {
              header: ctx.request.header,
              params: ctx.query,
              body: ctx.request.body,
            },
            response: {
              header: ctx.response.header,
              body: ctx.response.body,
            },
          },
        }),
      })
    }
  }
}
