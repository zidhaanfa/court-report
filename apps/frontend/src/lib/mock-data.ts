export const roles = [
  { id: 'admin', name: 'Admin', permissions: ['all'] },
  { id: 'reporter', name: 'Reporter', permissions: ['view_jobs', 'edit_jobs'] },
  { id: 'editor', name: 'Editor', permissions: ['view_jobs', 'review_jobs'] },
]

export const users = [
  { id: '1', name: 'Zidan Fath', email: 'zidan@example.com', role: 'admin', status: 'active' },
  { id: '2', name: 'John Doe', email: 'john@example.com', role: 'reporter', status: 'active' },
  { id: '3', name: 'Jane Smith', email: 'jane@example.com', role: 'editor', status: 'inactive' },
]

export const permissions = [
  { id: 'view_jobs', name: 'View Jobs', description: 'Allows viewing job list' },
  { id: 'edit_jobs', name: 'Edit Jobs', description: 'Allows editing job details' },
  { id: 'review_jobs', name: 'Review Jobs', description: 'Allows reviewing transcripts' },
  { id: 'all', name: 'All Permissions', description: 'Super admin access' },
]
