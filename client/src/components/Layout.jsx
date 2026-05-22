import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

/**
 * Navigation items shown per role. Icon class uses Font Awesome
 * naming that matches the icon files loaded in the project.
 */
const sidebarSections = {
  RESIDENT: [
    { path: '/', iconClass: 'fa-home',                    label: 'Home' },
    { path: '/profile', iconClass: 'fa-user',             label: 'My Profile' },
    { path: '/documents', iconClass: 'fa-file-alt',       label: 'Document Request' },
  ],
  OFFICIAL: [
    { path: '/', iconClass: 'fa-home',                    label: 'Home' },
    { path: '/profile', iconClass: 'fa-user',             label: 'My Profile' },
    { path: '/officials', iconClass: 'fa-users',           label: 'Barangay Officials' },
    { path: '/residents', iconClass: 'fa-user-friends',    label: 'Residents' },
    { path: '/demographics', iconClass: 'fa-chart-pie',    label: 'Demographics' },
    { path: '/projects', iconClass: 'fa-folder-open',      label: 'Projects' },
    { path: '/sessions', iconClass: 'fa-calendar-alt',     label: 'Sessions' },
  ],
  ADMIN: [
    { path: '/', iconClass: 'fa-home',                    label: 'Home' },
    { path: '/profile', iconClass: 'fa-user',             label: 'My Profile' },
    { path: '/officials', iconClass: 'fa-users',           label: 'Barangay Officials' },
    { path: '/residents', iconClass: 'fa-user-friends',    label: 'Residents' },
    { path: '/demographics', iconClass: 'fa-chart-pie',    label: 'Demographics' },
    { path: '/projects', iconClass: 'fa-folder-open',      label: 'Projects' },
    { path: '/sessions', iconClass: 'fa-calendar-alt',     label: 'Sessions' },
    { path: '/archives', iconClass: 'fa-archive',          label: 'Archives' },
    { path: '/documents', iconClass: 'fa-file-alt',        label: 'Document Request' },
    { path: '/activity-log', iconClass: 'fa-chart-line',   label: 'Activity Log' },
  ],
};

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = sidebarSections[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* ══════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════ */}
      <Box
        sx={{
          width: 260,
          minHeight: '100vh',
          position: 'fixed',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#1e293b',
        }}
      >
        {/* ── Brand / Profile Header ── */}
        <Box
          sx={{
            pt: 5,
            pb: 4,
            px: 2.5,
            textAlign: 'center',
            borderBottom: '1px solid rgba(148,163,184,.12)',
          }}
        >
          <Box
            component="img"
            src="/barangay_logo.png"
            alt="Barangay Logo"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'white',
              p: 1.5,
              mb: 2.5,
            }}
          />
          <Typography
            variant="subtitle1"
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: '16px',
              lineHeight: 1.4,
              mb: 0.25,
            }}
          >
            {user?.fullName || 'Guest'}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#94a3b8',
              fontSize: '11px',
              letterSpacing: '.5px',
              textTransform: 'uppercase',
            }}
          >
            {user?.role || '—'}
          </Typography>
        </Box>

        {/* ── Navigation ── */}
        <Box component="nav" sx={{ flex: 1, overflowY: 'auto', py: 3.5, px: 1 }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '14px 26px',
                margin: '6px 12px',
                borderRadius: 3,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? 'rgba(59,130,246,.18)' : 'transparent',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'background .15s, color .15s',
              })}
            >
              <i
                className={`fas ${item.iconClass}`}
                style={{ width: 22, fontSize: '15px', textAlign: 'center' }}
              />
              {item.label}
            </NavLink>
          ))}
        </Box>

        {/* ── Logout ── */}
        <Box
          onClick={handleLogout}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            px: 2.5,
            py: 2,
            mx: 2.5,
            mb: 3,
            borderRadius: 3,
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            userSelect: 'none',
            border: '1px solid rgba(148,163,184,.12)',
            transition: 'background .15s, color .15s',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,.06)',
              color: '#f1f5f9',
              borderColor: 'rgba(148,163,184,.22)',
            },
          }}
        >
          <span className="fas fa-sign-out-alt" aria-hidden="true" style={{ fontSize: '14px', textAlign: 'center' }} />
          Logout
        </Box>
      </Box>

      {/* ══════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════ */}
      <Box component="main" sx={{ ml: '260px', flex: 1, minHeight: '100vh', px: 3, py: 2 }}>
        <Outlet />
      </Box>

    </Box>
  );
};

export default Layout;
