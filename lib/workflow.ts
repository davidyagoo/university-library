import config from './config'
import { Client } from '@upstash/workflow'

export const workflowClient = new Client({
  token: config.env.upstash.qstashToken,
})
