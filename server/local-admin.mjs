import { createAdminHandler } from './admin-api.mjs'
import { dataDirectory, localAdminBackend } from './admin-store.mjs'

export function localHost(host, port) {
  return ['localhost:', '127.0.0.1:'].some(prefix => host === prefix + port)
}

export function createAdminApi({ directory = dataDirectory(), port = 5173 } = {}) {
  return createAdminHandler({
    backend: localAdminBackend(directory),
    originFor: request => localHost(request.headers.host, port) ? 'http://' + request.headers.host : null,
  })
}
