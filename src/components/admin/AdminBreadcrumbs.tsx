// ==============================================================================
// File: src/components/admin/AdminBreadcrumbs.tsx
// Description: Breadcrumbs component for internal navigation in admin shell
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({ items }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className="admin-breadcrumbs-nav"
    >
      <Link
        to="/admin"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'rgba(252, 251, 251, 0.7)',
          textDecoration: 'none',
          transition: 'color 0.15s ease'
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#F7D794')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(252, 251, 251, 0.7)')}
      >
        <Home size={13} />
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={item.label}>
            <ChevronRight size={12} style={{ opacity: 0.5 }} />
            {isLast || !item.path ? (
              <span style={{ color: '#F7D794', fontWeight: 600 }}>{item.label}</span>
            ) : (
              <Link
                to={item.path}
                style={{
                  color: 'rgba(252, 251, 251, 0.7)',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#F7D794')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(252, 251, 251, 0.7)')}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
