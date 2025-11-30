'use client'

import Link from 'next/link'
import { LayoutDashboard, CheckSquare, Calendar, Settings, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
    return (
        <div className="w-64 border-r bg-gray-50/50 h-screen flex flex-col p-4">
            <div className="flex items-center gap-2 px-2 mb-8">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">FocusFlow</span>
            </div>

            <div className="space-y-1">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/" active />
                <SidebarItem icon={CheckSquare} label="My Tasks" href="/tasks" />
                <SidebarItem icon={Calendar} label="Calendar" href="/calendar" />
                <SidebarItem icon={Settings} label="Settings" href="/settings" />
            </div>

            <div className="mt-8">
                <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Lists</span>
                    <button className="p-1 hover:bg-gray-200 rounded">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
                <div className="space-y-1">
                    <SidebarItem label="Personal" href="/list/personal" color="bg-pink-500" />
                    <SidebarItem label="Work" href="/list/work" color="bg-blue-500" />
                    <SidebarItem label="Shopping" href="/list/shopping" color="bg-green-500" />
                </div>
            </div>
        </div>
    )
}

function SidebarItem({
    icon: Icon,
    label,
    href,
    active,
    color
}: {
    icon?: any,
    label: string,
    href: string,
    active?: boolean,
    color?: string
}) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-gray-100/50 hover:text-primary"
            )}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {color && <div className={cn("w-2 h-2 rounded-full", color)} />}
            {label}
        </Link>
    )
}
