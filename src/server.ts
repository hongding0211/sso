import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import logger = require('koa-logger')
import cors = require('koa-cors')
import https = require('https')
import fs = require('fs')
import path = require('path')
import sslify from 'koa-sslify'
import router from './router'

const app = new Koa()

app.use(sslify())

app.use(
  cors({
    credentials: true,
    maxAge: 60 * 60 * 1000,
  })
)

app.use(async (ctx, next) => {
  const startTime = Date.now()

  ctx.set('Content-Type', 'application/json')

  await next()

  ctx.set('x-time-cost', `${Date.now() - startTime}`)
})

app.use(bodyParser())

app.use(logger())

app.use(router)

// app.listen(3000)

const options = {
  key: fs.readFileSync(path.join(__dirname, '../cert/server.key'), 'utf8'),
  cert: fs.readFileSync(path.join(__dirname, '../cert/server.pem'), 'utf8'),
}

https.createServer(options, app.callback()).listen(3001)
