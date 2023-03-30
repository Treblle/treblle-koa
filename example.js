require('dotenv').config()

const Koa = require('koa')
const treblle = require('./index')
const app = new Koa()

// x-response-time
app.use(
  treblle({
    apiKey: process.env.TREBLLE_API_KEY,
    projectId: process.env.TREBLLE_PROJECT_ID,
  })
)

// response
app.use(async (ctx) => {
  ctx.body = { message: 'Hello World' }
})

app.listen(4000)
