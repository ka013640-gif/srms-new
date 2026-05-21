import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, Typography } from '@mui/material';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItemsByRole = {
    RESIDENT: [
      { path: '/', icon: 'fa-home', label: 'Home' },
      { path: '/profile', icon: 'fa-user', label: 'My Profile' },
      { path: '/documents', icon: 'fa-file-alt', label: 'Document Request' },
    ],
    OFFICIAL: [
      { path: '/', icon: 'fa-home', label: 'Home' },
      { path: '/profile', icon: 'fa-user', label: 'My Profile' },
      { path: '/officials', icon: 'fa-users', label: 'Barangay Officials' },
      { path: '/residents', icon: 'fa-user-friends', label: 'Residents' },
      { path: '/demographics', icon: 'fa-chart-pie', label: 'Demographics' },
      { path: '/projects', icon: 'fa-folder-open', label: 'Projects' },
      { path: '/sessions', icon: 'fa-calendar-alt', label: 'Sessions' },
    ],
    ADMIN: [
      { path: '/', icon: 'fa-home', label: 'Home' },
      { path: '/profile', icon: 'fa-user', label: 'My Profile' },
      { path: '/officials', icon: 'fa-users', label: 'Barangay Officials' },
      { path: '/residents', icon: 'fa-user-friends', label: 'Residents' },
      { path: '/demographics', icon: 'fa-chart-pie', label: 'Demographics' },
      { path: '/projects', icon: 'fa-folder-open', label: 'Projects' },
      { path: '/sessions', icon: 'fa-calendar-alt', label: 'Sessions' },
      { path: '/archives', icon: 'fa-archive', label: 'Archives' },
      { path: '/documents', icon: 'fa-file-alt', label: 'Document Request' },
      { path: '/activity-log', icon: 'fa-chart-line', label: 'Activity Log' },
    ],
  };

  const filteredMenu = menuItemsByRole[user?.role] || [];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: 250,
          bgcolor: '#1e293b',
          color: '#cbd5e1',
          height: '100vh',
          position: 'fixed',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Sidebar Header */}
        <Box sx={{ textAlign: 'center', padding: '30px 20px 20px', borderBottom: '1px solid #334155' }}>
          <Box
            component="img"
            src="/barangay_logo.png"
            alt="Barangay Logo"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'white',
              padding: '2px',
              objectFit: 'cover',
              mb: 1
            }}
          />
          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
            {user?.fullName || 'Guest'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '12px' }}>
            {user?.role || 'Resident'}
          </Typography>
        </Box>

        {/* Menu */}
        <Box component="ul" sx={{ listStyle: 'none', flex: 1, overflowY: 'auto', pt: 1 }}>
          {filteredMenu.map((item) => (
            <Box component="li" key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px 25px',
                  color: isActive ? 'white' : '#cbd5e1',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: isActive ? '#334155' : 'transparent',
                  borderLeft: isActive ? '4px solid #3b82f6' : '4px solid transparent'
                })}
              >
                <i className={`fas ${item.icon}`} style={{ width: '30px', fontSize: '16px' }} />
                {item.label}
              </NavLink>
            </Box>
          ))}
        </Box>

        {/* Logout */}
        <Box sx={{ padding: '15px 0', borderTop: '1px solid #334155' }}>
          <Box
            component="button"
            onClick={handleLogout}
            sx={{
              display: 'flex',
              alignItems: 'center',
              padding: '15px 25px',
              color: '#cbd5e1',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              '&:hover': { backgroundColor: '#334155' }
            }}
          >
            <i className="fas fa-sign-out-alt" style={{ width: '30px', fontSize: '16px' }} />
            Logout
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flex: 1, ml: '250px' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
