'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Loader2, Box, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const DEMO_USERS = [
  { email: 'admin@nexuscrm.io', password: 'admin123', role: 'Administrator', color: 'bg-emerald-100 text-emerald-700', desc: 'Full access' },
  { email: 'manager@nexuscrm.io', password: 'manager123', role: 'Sales Manager', color: 'bg-violet-100 text-violet-700', desc: 'Team scope' },
  { email: 'rep@nexuscrm.io', password: 'rep123', role: 'Sales Rep', color: 'bg-sky-100 text-sky-700', desc: 'Own data' },
]

export function LoginForm() {
  const [email, setEmail] = useState('admin@nexuscrm.io')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      toast.error('Invalid credentials. Try a demo account below.')
    } else if (res?.ok) {
      toast.success('Welcome back!')
      window.location.reload()
    }
  }

  async function quickLogin(demo: { email: string; password: string }) {
    setEmail(demo.email)
    setPassword(demo.password)
    setLoading(true)
    const res = await signIn('credentials', { email: demo.email, password: demo.password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      toast.success('Signed in')
      window.location.reload()
    } else {
      toast.error('Login failed')
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100">
      {/* Left side — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <Box className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Nexus CRM</h1>
              <p className="text-xs text-emerald-400/80 font-medium">B2B Sales Platform</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Close more deals.<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Faster than ever.</span>
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed max-w-md">
            The modern CRM built for sales teams — manage leads, customers, quotations, orders, and payments all in one place.
          </p>
          <div className="flex flex-wrap gap-2">
            {['16 Modules', 'Real-time', 'Kanban Boards', 'PDF Invoices', 'Role-based Access'].map((feat) => (
              <span key={feat} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                {feat}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-sm text-slate-400">
          <div>
            <p className="text-2xl font-bold text-white">10K+</p>
            <p className="text-xs">Records managed</p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div>
            <p className="text-2xl font-bold text-white">99.9%</p>
            <p className="text-xs">Uptime</p>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div>
            <p className="text-2xl font-bold text-white">16</p>
            <p className="text-xs">Integrated modules</p>
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <Box className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Nexus CRM</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your B2B sales workspace</p>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-11"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 gap-2 shadow-md shadow-emerald-500/20" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Quick demo login</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      onClick={() => quickLogin(u)}
                      disabled={loading}
                      className="group flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-all hover:border-primary/30 hover:shadow-sm disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-semibold text-slate-700">
                          {u.role.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{u.role}</p>
                          <p className="text-[11px] text-muted-foreground">{u.desc}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Nexus CRM · Built with Next.js, Prisma &amp; shadcn/ui
          </p>
        </div>
      </div>
    </div>
  )
}
