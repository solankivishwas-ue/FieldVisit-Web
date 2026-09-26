// Team Management hub — Manager only.
// Three sub-features: User Management, Assign Employees, Team Hierarchy.

import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import ErrorBoundary from '../../components/ErrorBoundary';

interface FeatureCard {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

const UsersIcon = () => (
  <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.874M9 20H4v-2a4 4 0 015-3.874m6-4.126a4 4 0 10-8 0 4 4 0 008 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const AssignIcon = () => (
  <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const HierarchyIcon = () => (
  <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h4v4H3v-4zm7-7h4v4h-4V3zm7 7h4v4h-4v-4zM7 12h4m2-6h4M9 12V7m6 0v5" />
  </svg>
);

export default function TeamPage() {
  const navigate = useNavigate();

  const cards: FeatureCard[] = [
    {
      title: 'User Management',
      description: 'View all users and assign roles (Employee, Senior).',
      path: '/manager/team/users',
      icon: <UsersIcon />,
    },
    {
      title: 'Assign Employees',
      description: 'Assign employees to seniors for team supervision.',
      path: '/manager/team/assign',
      icon: <AssignIcon />,
    },
    {
      title: 'Team Hierarchy',
      description: 'View the organizational structure of your team.',
      path: '/manager/team/hierarchy',
      icon: <HierarchyIcon />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ErrorBoundary>
        <NavBar title="Team" />
      </ErrorBoundary>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Team Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your team structure, roles, and assignments.
        </p>

        <div className="space-y-3 pt-2">
          {cards.map((card) => (
            <button
              key={card.path}
              type="button"
              onClick={() => navigate(card.path)}
              className="w-full flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-5 py-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500 transition-all text-left"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                {card.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{card.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.description}</p>
              </div>
              <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 ml-auto flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
