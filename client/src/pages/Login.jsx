import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Paper, CircularProgress, Alert, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';

let loginTimeout = null;

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(() => localStorage.getItem('lastRole') || 'Resident');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Debounce rapid submissions
    if (loginTimeout) {
      clearTimeout(loginTimeout);
    }
    
    setLoading(true);
    console.log('Attempting login with:', { username, password, role }); // Debug log

    try {
      await login(username, password);
      console.log('Login successful'); // Debug log
      localStorage.setItem('lastRole', role);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err); // Debug log
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#f0f2f5'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 420,
          borderRadius: 2,
          textAlign: 'center'
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Box
            component="img"
            src="/barangay_logo.png"
            alt="Barangay Logo"
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              objectFit: 'cover',
              mb: 2
            }}
          />
          <Typography variant="h5" component="h2" fontWeight={600} color="#1e293b">
            Welcome to San Roque
          </Typography>
          <Typography variant="body2" color="#64748b" sx={{ mt: 1 }}>
            Please log in to continue
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ mb: 2, textAlign: 'left' }}>
            <Typography variant="body2" fontWeight={600} color="#374151" gutterBottom>
              Select Role
            </Typography>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                fontSize: '14px'
              }}
            >
              <option value="Admin">Admin</option>
              <option value="Resident">Resident</option>
            </select>
          </Box>

          <Box sx={{ mb: 2, textAlign: 'left' }}>
            <Typography variant="body2" fontWeight={600} color="#374151" gutterBottom>
              Username
            </Typography>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                fontSize: '14px'
              }}
            />
          </Box>

          <Box sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2" fontWeight={600} color="#374151" gutterBottom>
              Password
            </Typography>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                fontSize: '14px'
              }}
            />
          </Box>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1c2434',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
          </button>
        </Box>

        <Typography variant="body2" color="#64748b" sx={{ mt: 2 }}>
          Don't have an account? <a href="/register" style={{ color: '#1c2434', textDecoration: 'underline' }}>Register</a>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;