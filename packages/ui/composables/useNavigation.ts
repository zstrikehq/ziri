export interface NavItem {
  name: string
  path: string
  icon: string
  adminOnly?: boolean
  requiresAdmin?: boolean
}

export interface NavSection {
  title: string
  icon: string
  adminOnly?: boolean
  items: NavItem[]
}

export const dashboardItem: NavItem = { 
  name: 'Dashboard', 
  path: '/', 
  icon: 'dashboard', 
  adminOnly: true 
}

export function getNavSections(isDashboardUser: boolean): NavSection[] {
  const sections: NavSection[] = []

  if (isDashboardUser) {
    sections.push(
      {
        title: 'Analytics & Monitoring',
        icon: 'chart',
        adminOnly: false,
        items: [
          { name: 'Analytics', path: '/analytics', icon: 'analytics', adminOnly: false },
          { name: 'Logs', path: '/logs', icon: 'logs', adminOnly: false }
        ]
      },
      {
        title: 'Guardrails',
        icon: 'lock',
        adminOnly: false,
        items: [
          { name: 'Schema', path: '/schema', icon: 'schema', adminOnly: false },
          { name: 'Policies', path: '/policies', icon: 'rules', adminOnly: false }
        ]
      },
      {
        title: 'Access Management',
        icon: 'key',
        adminOnly: false,
        items: [
          { name: 'Users', path: '/users', icon: 'users', adminOnly: false },
          { name: 'API Keys', path: '/keys', icon: 'keys', adminOnly: false },
          { name: 'Roles', path: '/settings/roles', icon: 'roles', adminOnly: true }
        ]
      },
      {
        title: 'LLM Providers',
        icon: 'providers',
        adminOnly: false,
        items: [
          { name: 'Providers', path: '/providers', icon: 'providers', adminOnly: false }
        ]
      },
      {
        title: 'Settings',
        icon: 'settings',
        adminOnly: true,
        items: [
          { name: 'Configuration', path: '/config', icon: 'config', adminOnly: true },
          { name: 'Manage Users', path: '/settings/manage-users', icon: 'users', adminOnly: true, requiresAdmin: true },
          { name: 'Internal Logs', path: '/settings/internal-audit', icon: 'logs', adminOnly: true }
        ]
      }
    )
  }


  sections.push({
    title: 'My Account',
    icon: 'user',
    adminOnly: false,
    items: [
      { name: 'My Profile', path: '/me', icon: 'user', adminOnly: false }
    ]
  })

  return sections
}

export const navigationIcons: Record<string, string> = {
  dashboard: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  analytics: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  logs: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  schema: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  rules: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  keys: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  users: 'M12 4.354a4 4 0 100 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  providers: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  config: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  roles: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a3 3 0 110 6 3 3 0 010-6zm0 8c-2.67 0-5 1.34-5 3.5V19h10v-2.5C17 14.34 14.67 13 12 13z'
}

export function getIcon(iconName: string): string {
  return navigationIcons[iconName] || navigationIcons.dashboard
}

export function getAdminOnlyPages(): string[] {
  const pages: string[] = []
  

  if (dashboardItem.adminOnly) {
    pages.push(dashboardItem.path)
  }
  

  const sections = getNavSections(true)
  
  for (const section of sections) {

    if (section.adminOnly) {
      for (const item of section.items) {
        pages.push(item.path)
      }
    } else {

      for (const item of section.items) {
        if (item.adminOnly) {
          pages.push(item.path)
        }
      }
    }
  }
  
  return pages
}

export function useNavigation() {
  const route = useRoute()
  
  const isActive = (path: string) => {
    if (path === '/') {
      return route.path === '/'
    }
    return route.path.startsWith(path)
  }
  
  return {
    dashboardItem,
    getNavSections,
    getIcon,
    getAdminOnlyPages,
    isActive,
    navigationIcons
  }
}
