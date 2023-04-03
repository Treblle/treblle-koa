const {
  sendPayloadToTreblle,
  generateFieldsToMask,
  maskSensitiveValues,
  getRequestDuration,
  generateTrebllePayload,
  getResponsePayload,
} = require('@treblle/utils')

const { version: sdkVersion } = require('./package.json')

module.exports = treblle

/**
 * Expose the Treblle middleware
 * @param {{apiKey?: string, projectId?: string, additionalFieldsToMask?: string[]}} options - Middleware options.
 * @returns {Function} - treblle-koa middleware.
 */
function treblle({
  apiKey = process.env.TREBLLE_API_KEY,
  projectId = process.env.TREBLLE_PROJECT_ID,
  additionalFieldsToMask = [],
} = {}) {
  return async function treblleMiddleware(ctx, next) {
    // Track when this request was received.
    const requestStartTime = process.hrtime()
    await next()
    const loadTime = getRequestDuration(requestStartTime)

    let errors = []
    const body = ctx.request.body
    const query = ctx.query
    const requestPayload = { ...body, ...query }

    const fieldsToMask = generateFieldsToMask(additionalFieldsToMask)
    const maskedRequestPayload = maskSensitiveValues(requestPayload, fieldsToMask)

    const protocol = `${ctx.request.protocol}/${ctx.req.httpVersion}`

    const { payload: maskedResponseBody, error: invalidResponseBodyError } = getResponsePayload(
      ctx.body,
      fieldsToMask
    )

    if (invalidResponseBodyError) {
      errors.push(invalidResponseBodyError)
    }

    const trebllePayload = generateTrebllePayload(
      {
        api_key: apiKey,
        project_id: projectId,
        sdk: 'koa',
        version: sdkVersion,
      },
      {
        server: {
          protocol,
        },
        request: {
          ip: ctx.ip,
          url: ctx.href,
          user_agent: ctx.headers['user-agent'],
          method: ctx.method,
          headers: maskSensitiveValues(ctx.headers, fieldsToMask),
          body: maskedRequestPayload,
        },
        response: {
          headers: maskSensitiveValues(ctx.response.headers, fieldsToMask),
          code: ctx.status,
          size: ctx.length,
          load_time: loadTime,
          body: maskedResponseBody,
        },
        errors,
      }
    )
    try {
      sendPayloadToTreblle(trebllePayload, apiKey)
    } catch (error) {
      console.log(error)
    }
  }
}
