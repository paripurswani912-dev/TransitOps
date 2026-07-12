export const RBAC_MATRIX = {
  FleetManager: {
    '/fleet': '✓',
    '/drivers': 'view',
    '/dispatch': '✓',
    '/maintenance': '✓',
    '/fuel-expenses': 'view',
    '/analytics': '—',
  },
  Dispatcher: {
    '/fleet': 'view',
    '/drivers': 'view',
    '/dispatch': '✓',
    '/maintenance': '—',
    '/fuel-expenses': '—',
    '/analytics': '—',
  },
  SafetyOfficer: {
    '/fleet': '—',
    '/drivers': '✓',
    '/dispatch': 'view',
    '/maintenance': '—',
    '/fuel-expenses': '—',
    '/analytics': 'view',
  },
  FinancialAnalyst: {
    '/fleet': '—',
    '/drivers': '—',
    '/dispatch': '—',
    '/maintenance': 'view',
    '/fuel-expenses': '✓',
    '/analytics': '✓',
  }
};
