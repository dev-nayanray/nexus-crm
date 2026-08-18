import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        let user
        try {
          user = await db.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          })
        } catch (err) {
          // A DB/connection error looks identical to "wrong password" in the UI toast,
          // so log it loudly here — check Vercel function logs for this line.
          console.error('[auth] DB error during login lookup:', err)
          throw new Error('AuthDatabaseError')
        }

        if (!user || user.status !== 'ACTIVE') {
          console.warn(`[auth] Login failed: no active user for ${credentials.email.toLowerCase()}`)
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'SALES_REP'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export type AppSession = {
  user: {
    id: string
    email: string
    name: string
    role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP'
  }
}
