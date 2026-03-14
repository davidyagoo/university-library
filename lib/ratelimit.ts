import redis from '@/database/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Create a new ratelimiter, that allows 5 requests per 5 seconds
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(10, '1m'),
  analytics: true,
  prefix: '@upstash/ratelimit',
})

export default ratelimit
