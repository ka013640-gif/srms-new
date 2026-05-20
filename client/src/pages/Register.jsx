import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Typography, Box, Paper, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    fullname: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await register(formData.fullname, formData.username, formData.password);
      setSuccess('Registration successful! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
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
          borderRadius: 2
        }}
      >
        <Typography variant="h5" component="h1" textAlign="center" fontWeight={600} color="#1e293b" mb={1}>
          Create Account
        </Typography>
        <Typography variant="body2" color="#64748b" textAlign="center" mb={3}>
          Register as a resident of San Roque
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ mb: 2, textAlign: 'left' }}>
            <Typography variant="body2" fontWeight={600} color="#374151" gutterBottom>
              Full Name
            </Typography>
            <input
              type="text"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
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

          <Box sx={{ mb: 2, textAlign: 'left' }}>
            <Typography variant="body2" fontWeight={600} color="#374151" gutterBottom>
              Username
            </Typography>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
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
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </Box>

        <Typography variant="body2" color="#64748b" textAlign="center" mt={2}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1c2434', textDecoration: 'none', fontWeight: 500 }}>
            Log in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Register;
