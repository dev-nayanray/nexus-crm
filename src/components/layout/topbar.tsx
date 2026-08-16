'use client'

import { Menu, Plus, HelpCircle, LogOut, User as UserIcon, Settings as SettingsIcon, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { CommandPalette } from '@/components/shared/command-palette'
import { NotificationsPanel } from '@/components/shared/notifications-panel'
import { useAuth } from '@/hooks/use-auth'
import { useModuleStore } from '@/stores/module-store'
import { MODULE_LABELS, ROLES } from '@/lib/constants'
import { initials } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'

interface TopbarProps {
  onNew?: () => void
  newLabel?: string
}

export function Topbar({ onNew, newLabel = 'New' }: TopbarProps) {
  const { user } = useAuth()
  const active = useModuleStore((s) => s.active)
  const setSidebarOpen = useModuleStore((s) => s.setSidebar)
  const sidebarOpen = useModuleStore((s) => s.sidebarOpen)
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border glass px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Page title — cleaner hierarchy */}
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {MODULE_LABELS[active]}
          </h2>
        </div>

        {/* Search — more prominent */}
        <div className="ml-auto hidden md:block lg:ml-8">
          <CommandPalette />
        </div>

        {/* Actions — cleaner spacing */}
        <div className="ml-auto flex items-center gap-1 md:ml-3">
          {onNew && (
            <Button size="sm" onClick={onNew} className="gap-1.5 shadow-sm shadow-emerald-500/20">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{newLabel}</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="text-muted-foreground hover:text-foreground"
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </Button>

          <NotificationsPanel />

          <Button variant="ghost" size="icon" aria-label="Help" className="text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* User menu — refined */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2 rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9 border-2 border-border">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-semibold text-white">
                    {initials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 shadow-lg">
              <div className="px-2 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-semibold text-white">
                      {initials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`mt-2 ${ROLES[user?.role ?? 'SALES_REP']?.color}`}>
                  {ROLES[user?.role ?? 'SALES_REP']?.label}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/?m=users')} className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/?m=settings')} className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/' })}
                className="cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50 dark:focus:bg-rose-950/30"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-none">
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
