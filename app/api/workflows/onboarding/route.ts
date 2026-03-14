import { db } from '@/database/drizzle'
import { users } from '@/database/schema'
import { eq } from 'drizzle-orm'
import config from '@/lib/config'
import { serve } from '@upstash/workflow/nextjs'

type UserState = 'non-active' | 'active'

type InitialData = {
  email: string
  fullName: string
}

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000

const getUserState = async (email: string): Promise<UserState> => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (user.length === 0) return 'non-active'

  const lastActivityDate = new Date(user[0].lastActivityDate!)
  const now = new Date()
  const timeDiff = now.getTime() - lastActivityDate.getTime()

  if (timeDiff > 3 * ONE_DAY_IN_MS && timeDiff <= 30 * ONE_DAY_IN_MS) {
    return 'non-active'
  }
  return 'active'
}

export const { POST } = serve<InitialData>(async (context) => {
  const { email, fullName } = context.requestPayload

  await context.run('new-signup', async () => {
    const { status, body } = await context.api.resend.call('Call Resend', {
      token: config.env.resendToken!,
      headers: {
        'content-type': 'application/json',
      },
      body: {
        from: 'Acme <onboarding@welcome.micropo.online>',
        to: [email],
        subject: 'Welcome to the platform',
        html: `<p>Welcome ${fullName}</p>`,
      },
    })
  })

  await context.sleep('wait-for-3-days', 60 * 60 * 24 * 3)

  while (true) {
    const state = await context.run('check-user-state', async () => {
      return await getUserState(email)
    })

    if (state === 'non-active') {
      const { status, body } = await context.api.resend.call('Call Resend', {
        token: config.env.resendToken!,
        body: {
          from: 'Acme <onboarding@welcome.micropo.online>',
          to: [email],
          subject: 'Are you still there?',
          html: `<p>Hey ${fullName}, we miss you!</p>`,
        },
        headers: {
          'content-type': 'application/json',
        },
      })
    } else if (state === 'active') {
      const { status, body } = await context.api.resend.call('Call Resend', {
        token: config.env.resendToken!,
        body: {
          from: 'Acme <onboarding@welcome.micropo.online>',
          to: [email],
          subject: 'Welcome back!',
          html: `<p>Welcome back ${fullName}!</p>`,
        },
        headers: {
          'content-type': 'application/json',
        },
      })
    }

    await context.sleep('wait-for-1-month', 60 * 60 * 24 * 30)
  }
})
