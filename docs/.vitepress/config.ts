import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ZIRI',
  description: 'Production-grade LLM Gateway with Cedar-based Authorization',
  base: '/',
  
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started/introduction' },
      { text: 'API Reference', link: '/api-reference/' },
      { text: 'SDK', link: '/sdk/' },
      { text: 'Guides', link: '/guides/policy-examples' },
      { text: 'Deployment', link: '/deployment/docker-compose' },
    ],
    
    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/introduction' },
            { text: 'Quick Start', link: '/getting-started/quickstart' },
            { text: 'Installation', link: '/getting-started/installation' },
          ]
        }
      ],
      
      '/api-reference/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api-reference/' },
          ]
        },
        {
          text: 'User Endpoints',
          items: [
            { text: 'Chat Completions', link: '/api-reference/user-endpoints/chat-completions' },
            { text: 'Embeddings', link: '/api-reference/user-endpoints/embeddings' },
            { text: 'Images', link: '/api-reference/user-endpoints/images' },
          ]
        },
        {
          text: 'Admin Endpoints',
          items: [
            { text: 'Authentication', link: '/api-reference/admin-endpoints/authentication' },
            { text: 'Users', link: '/api-reference/admin-endpoints/users' },
            { text: 'Keys', link: '/api-reference/admin-endpoints/keys' },
            { text: 'Providers', link: '/api-reference/admin-endpoints/providers' },
            { text: 'Policies', link: '/api-reference/admin-endpoints/policies' },
            { text: 'Schema', link: '/api-reference/admin-endpoints/schema' },
            { text: 'Config', link: '/api-reference/admin-endpoints/config' },
            { text: 'Audit', link: '/api-reference/admin-endpoints/audit' },
            { text: 'Stats', link: '/api-reference/admin-endpoints/stats' },
            { text: 'Entities', link: '/api-reference/admin-endpoints/entities' },
            { text: 'Costs', link: '/api-reference/admin-endpoints/costs' },
          ]
        },
        {
          text: 'System Endpoints',
          items: [
            { text: 'Health', link: '/api-reference/system-endpoints/health' },
            { text: 'Events', link: '/api-reference/system-endpoints/events' },
          ]
        }
      ],
      
      '/sdk/': [
        {
          text: 'SDK',
          items: [
            { text: 'Overview', link: '/sdk/' },
            { text: 'Installation', link: '/sdk/installation' },
            { text: 'Usage', link: '/sdk/usage' },
            { text: 'API Reference', link: '/sdk/api-reference' },
          ]
        }
      ],
      
      '/configuration/': [
        {
          text: 'Configuration',
          items: [
            { text: 'Overview', link: '/configuration/' },
            { text: 'Environment Variables', link: '/configuration/environment-variables' },
            { text: 'Config File', link: '/configuration/config-file' },
            { text: 'Email Setup', link: '/configuration/email-setup' },
          ]
        }
      ],
      
      '/deployment/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Docker', link: '/deployment/docker' },
            { text: 'Docker Compose', link: '/deployment/docker-compose' },
            { text: 'Production', link: '/deployment/production' },
          ]
        }
      ],
      
      '/guides/': [
        {
          text: 'Guides',
          items: [
            { text: 'Policy Examples', link: '/guides/policy-examples' },
            { text: 'Provider Setup', link: '/guides/provider-setup' },
            { text: 'First Policy', link: '/guides/first-policy' },
            { text: 'User Management', link: '/guides/user-management' },
            { text: 'Monitoring', link: '/guides/monitoring' },
          ]
        }
      ],
      
      '/troubleshooting/': [
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Common Issues', link: '/troubleshooting/common-issues' },
            { text: 'FAQ', link: '/troubleshooting/faq' },
          ]
        }
      ],
      
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Real-World Scenarios', link: '/examples/real-world-scenarios' },
            { text: 'Integration Examples', link: '/examples/integration-examples' },
          ]
        }
      ],
    },
    
    search: {
      provider: 'local'
    },
    
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 ZIRI'
    }
  }
})
