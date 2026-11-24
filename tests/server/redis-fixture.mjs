export function redisFixture() {
  let now = 0
  const values = new Map()
  const expires = new Map()
  const calls = []
  function read(key) {
    if (expires.has(key) && expires.get(key) <= now) {
      expires.delete(key)
      values.delete(key)
    }
    return values.get(key) ?? null
  }
  const redis = async (command, ...args) => {
    if (command === 'PING') return 'PONG'
    calls.push([command, ...args])
    if (command === 'PING') return 'PONG'
    if (command === 'GET' || command === 'GETEX') return read(args[0])
    if (command === 'DEL') {
      expires.delete(args[0])
      return Number(values.delete(args[0]))
    }
    if (command === 'SET') {
      values.set(args[0], args[1])
      if (args[2] === 'EX') expires.set(args[0], now + Number(args[3]))
      else expires.delete(args[0])
      return 'OK'
    }
    if (command === 'EVAL' && args[1] === 1) {
      const [, , key, prior, next] = args
      if ((read(key) ?? '') !== prior) return 0
      values.set(key, next)
      return 1
    }
    if (command === 'EVAL' && args[1] === 2) {
      const [, , client, site] = args
      if (Number(read(client)) >= 8) return Math.max(1, expires.get(client) - now)
      if (Number(read(site)) >= 50) return Math.max(1, expires.get(site) - now)
      for (const key of [client, site]) {
        const total = Number(read(key)) + 1
        if (total === 1) expires.set(key, now + 300)
        values.set(key, String(total))
      }
      return 0
    }
    throw new Error('Unexpected Redis operation: ' + command)
  }
  return { redis, calls, advance(seconds) { now += seconds } }
}
