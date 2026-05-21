import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import { Add, Edit, Delete, CalendarMonth, AccessTime, LocationOn, EventNote } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SESSIONS_ACCENT = {
  COMPLETED:   { color: '#16a34a', bg: 'rgba(22,163,74,.12)' },
  SCHEDULED:   { color: '#0369a1', bg: 'rgba(3,105,161,.12)' },
  CANCELLED:   { color: '#dc2626', bg: 'rgba(220,38,38,.12)' },
};

const STATUS_LABEL = {
  COMPLETED:   '#dcfce7',
  SCHEDULED:   '#e0f2fe',
  CANCELLED:   '#fee2e2',
};

const formatDate = (val) => val ? new Date(val).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const formatTime = (time24) => {
  if (!time24) return '—';
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const Sessions = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    attendees: '',
    status: 'SCHEDULED'
  });

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (session = null) => {
    if (session) {
      setEditing(session);
      setFormData({
        title: session.title,
        description: session.description || '',
        date: session.date?.split('T')[0],
        time: session.time,
        location: session.location,
        attendees: session.attendees || '',
        status: session.status || 'SCHEDULED'
      });
    } else {
      setEditing(null);
      setFormData({ title: '', description: '', date: '', time: '', location: '', attendees: '', status: 'SCHEDULED' });
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditing(null); };

  const handleSubmit = async () => {
    try {
      if (!isAdmin) return;
      if (editing) {
        await api.put(`sessions/${editing.session_id}`, formData);
      } else {
        await api.post('sessions', formData);
      }
      handleClose();
      fetchSessions();
    } catch (error) {
      console.error('Failed to save session:', error.response?.data || error);
      alert(`Failed to save session: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      await api.delete(`sessions/${id}`);
      fetchSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0f172a">Barangay Sessions</Typography>
          <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>Manage scheduled community meetings and assemblies</Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
            sx={{
              bgcolor: '#1e293b', borderRadius: 2, px: 3, py: 1.25,
              textTransform: 'none', fontWeight: 600, fontSize: '14px',
              boxShadow: '0 2px 8px rgba(30,41,59,.3)',
              '&:hover': { bgcolor: '#334155', boxShadow: '0 4px 14px rgba(30,41,59,.4)' }
            }}
          >
            Schedule Session
          </Button>
        )}
      </Box>

      {!sessions.length ? (
        <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
          <EventNote sx={{ fontSize: 56, mb: 2, opacity: .3 }} />
          <Typography variant="h6" color="#64748b">No sessions scheduled</Typography>
          <Typography variant="body2" color="#94a3b8" sx={{ mt: 1 }}>Schedule a session to get started</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sessions.map((session) => {
            const accent = SESSIONS_ACCENT[session.status] || { color: '#0369a1', bg: 'rgba(3,105,161,.12)' };
            return (
              <Grid item xs={12} sm={6} md={4} key={session.session_id}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    transition: 'transform .18s ease, box-shadow .18s ease',
                    cursor: 'default',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 6px 22px rgba(0,0,0,.09)',
                    },
                  }}
                >
                  {/* Accent top strip */}
                  <Box sx={{ height: 4, bgcolor: accent.color }} />

                  <Box sx={{ p: 2.75, display: 'flex', flexDirection: 'column', minHeight: 230 }}>
                    {/* Header row — title + status ── */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{
                          width: 34, height: 34, borderRadius: 1.5,
                          bgcolor: accent.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <EventNote sx={{ fontSize: 16, color: accent.color }} />
                        </Box>
                        <Typography variant="h6" fontWeight={700} color="#1e293b" sx={{ fontSize: '1rem', lineHeight: 1.3 }}>
                          {session.title}
                        </Typography>
                      </Box>
                      <Chip
                        label={session.status}
                        size="small"
                        sx={{
                          bgcolor: STATUS_LABEL[session.status] || '#f1f5f9',
                          color: accent.color,
                          fontWeight: 600,
                          fontSize: '0.68rem',
                          height: 22,
                          flexShrink: 0,
                        }}
                      />
                    </Box>

                    {/* Actions */}
                    {isAdmin && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 1.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpen(session)}
                          sx={{
                            color: '#64748b',
                            borderRadius: 1.5,
                            '&:hover': { bgcolor: '#f1f5f9', color: '#1e293b' },
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(session.session_id)}
                          sx={{
                            color: '#f87171',
                            borderRadius: 1.5,
                            '&:hover': { bgcolor: '#fef2f2', color: '#dc2626' },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}

                    {/* Description */}
                    <Typography
                      variant="body2"
                      color="#64748b"
                      sx={{ mb: 2, minHeight: 38, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}
                    >
                      {session.description || '—'}
                    </Typography>

                    {/* Spacer */}
                    <Box sx={{ flex: 1 }} />

                    {/* Meta rows ── */}
                    <Box
                      sx={{
                        display: 'flex', flexDirection: 'column', gap: 0.75,
                        pt: 1.5,
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarMonth sx={{ fontSize: 15, color: '#94a3b8', flexShrink: 0 }} />
                        <Typography variant="body2" color="#475569" sx={{ fontSize: '0.8rem' }}>
                          {formatDate(session.date)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime sx={{ fontSize: 15, color: '#94a3b8', flexShrink: 0 }} />
                        <Typography variant="body2" color="#475569" sx={{ fontSize: '0.8rem' }}>
                          {formatTime(session.time)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn sx={{ fontSize: 15, color: '#94a3b8', flexShrink: 0 }} />
                        <Typography variant="body2" color="#475569" sx={{ fontSize: '0.8rem' }}>
                          {session.location}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2.5, boxShadow: '0 8px 40px rgba(0,0,0,.12)' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#0f172a' }}>
          {editing ? 'Edit Session' : 'Schedule New Session'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            <TextField label="Title" fullWidth value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            <TextField label="Description" fullWidth multiline rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <TextField label="Date" type="date" fullWidth value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Time" type="time" fullWidth value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Location" fullWidth value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#1e293b', textTransform: 'none', fontWeight: 600, borderRadius: 1.5, px: 2.5 }}>
            {editing ? 'Update Session' : 'Schedule Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sessions;