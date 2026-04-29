"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import {
  LayoutDashboardIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  LifeBuoyIcon,
  GavelIcon,
  SettingsIcon,
  DollarSignIcon,
} from "lucide-react"
import { useAuthStore } from "../stores/auth.store"
import { Link } from "@tanstack/react-router"

const navMain = [
  {
    title: "Dashboard",
    url: "/app/dashboard",
    icon: (<LayoutDashboardIcon />),
  },
  {
    title: "Access Control",
    url: "#",
    icon: (<ShieldCheckIcon />),
    isActive: true,
    items: [
      { title: "Users", url: "/app/access/users" },
      { title: "Roles", url: "/app/access/roles" },
    ],
  },
  {
    title: "Jobs",
    url: "/app/jobs",
    icon: (<BriefcaseIcon />),
  },
  {
    title: "Payments",
    url: "/app/payments",
    icon: (<DollarSignIcon />),
  },
  {
    title: "Settings",
    url: "/app/settings",
    icon: (<SettingsIcon />),
  },
]

const navSecondary = [
  {
    title: "Support",
    url: "#",
    icon: (<LifeBuoyIcon />),
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((s) => s.user)

  const userData = {
    name: user?.fullName ?? "User",
    email: user?.email ?? "",
    avatar: "",
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/app/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GavelIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Court Report</span>
                  <span className="truncate text-xs">Workflow System</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
