import { useState, useEffect } from 'react';
import { Typography, Box, Grid, Paper, CircularProgress, Chip, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import People from '@mui/icons-material/People';
import FolderOpen from '@mui/icons-material/FolderOpen';
import Description from '@mui/icons-material/Description';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const getActivityColor = (action) => {
  if (!action) return 'default';
  if (action.includes('CREATE')) return 'success';
  if (action.includes('UPDATE')) return 'info';
  if (action.includes('DELETE')) return 'error';
  return 'default';
};

const renderActivityDetails = (activity) => {
  if (!activity) return '';
  const parts = [];
  if (activity.entityType) parts.push(activity.entityType.replace('_', ' '));
  if (activity.details) parts.push(activity.details);
  return parts.join(' – ') || activity.action.replace(/_/g, ' ');
};

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isOfficialOrAdmin = ['ADMIN', 'OFFICIAL'].includes(user?.role);
  const [stats, setStats] = useState({ residents: 0, projects: 0, requests: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announceLoading, setAnnounceLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [announceDialogOpen, setAnnounceDialogOpen] = useState(false);
  const [announceForm, setAnnounceForm] = useState({ title: '', content: '' });
  const [announceLoadingSubmit, setAnnounceLoadingSubmit] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const activeResidentsRes = await api.get('residents/stats');
        setStats(prev => ({ ...prev, residents: activeResidentsRes.data.active }));
      } catch (err) {
        console.error('Failed to fetch residents:', err);
      }
      try {
        const projectsRes = await api.get('projects');
        const activeCount = projectsRes.data.projects.filter(p => p.status === 'ACTIVE').length;
        setStats(prev => ({ ...prev, projects: activeCount }));
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
      try {
        const requestsRes = await api.get('documents');
        setStats(prev => ({ ...prev, requests: requestsRes.data.requests.filter(r => r.status === 'PENDING').length }));
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      }
      try {
        const activitiesRes = await api.get('activity/dashboard');
        setActivities(activitiesRes.data.recent || []);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      }

      if (isOfficialOrAdmin) {
        try {
          const annRes = await api.get('announcements');
          setAnnouncements(annRes.data.announcements);
        } catch (err) {
          console.error('Failed to fetch announcements:', err);
        } finally {
          setAnnounceLoading(false);
        }
      } else {
        setAnnounceLoading(false);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleOpenAnnounce = () => {
    setAnnounceForm({ title: '', content: '' });
    setAnnounceDialogOpen(true);
  };
  const handleCloseAnnounce = () => setAnnounceDialogOpen(false);

  const handleSubmitAnnounce = async () => {
    try {
      setAnnounceLoadingSubmit(true);
      await api.post('announcements', { ...announceForm, content: announceForm.content || '' });
      const annRes = await api.get('announcements');
      setAnnouncements(annRes.data.announcements);
      handleCloseAnnounce();
    } catch (err) {
      console.error('Failed to create announcement:', err);
    } finally {
      setAnnounceLoadingSubmit(false);
    }
  };

  return (
    <Box>
      {/* Topbar */}
      <Box
        sx={{
          background: 'white',
          padding: '20px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <Typography variant="h4" fontWeight={600} color="#1e293b">
          BARANGAY INFORMATION MANAGEMENT SYSTEM
        </Typography>
        <a href="/" style={{ textDecoration: 'none' }}>
          <Box
            component="button"
            sx={{
              bgcolor: '#1e293b',
              color: 'white',
              px: 3,
              py: 1,
              borderRadius: 1,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            HOME
          </Box>
        </a>
      </Box>

      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <Typography variant="h5" fontWeight={600} color="#1e293b" mb={1}>
            Welcome!
          </Typography>
          <Typography variant="body1" color="#64748b" mb={4}>
            Use the sidebar to navigate through the system modules.
          </Typography>

          {/* Announcements */}
          {isOfficialOrAdmin && (
            <Box mb={4}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b">
                  Announcements
                </Typography>
              </Box>
              {announceLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : announcements.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {announcements.map((a) => (
                    <Paper key={a.announcement_id} sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                        {a.title}
                      </Typography>
                      {a.content && (
                        <Typography variant="body2" color="#475569" sx={{ mt: 0.75 }}>
                          {a.content}
                        </Typography>
                      )}
                      <Typography variant="caption" color="#94a3b8" display="block" sx={{ mt: 0.75 }}>
                        {new Date(a.created_at).toLocaleString()}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="#64748b" textAlign="center" py={3}>
                  No announcements yet
                </Typography>
              )}

              {/* Add Announcement */}
              <Box sx={{ mt: 2 }}>
                {isOfficialOrAdmin && !announceLoading && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAnnounce}
                    sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5, px: 2.5, py: 1 }}
                  >
                    Add Announcement
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* Stats Cards */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: '#eff6ff',
                  borderLeft: '4px solid #3b82f6'
                }}
              >
                <People sx={{ fontSize: 40, color: '#3b82f6' }} />
                <Box>
                  <Typography variant="h3" fontWeight={700} color="#1e293b">
                    {loading ? <CircularProgress size={24} /> : stats.residents}
                  </Typography>
                  <Typography variant="body2" color="#64748b">Active Residents</Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: '#f0fdf4',
                  borderLeft: '4px solid #16a34a'
                }}
              >
                <FolderOpen sx={{ fontSize: 40, color: '#16a34a' }} />
                <Box>
                  <Typography variant="h3" fontWeight={700} color="#1e293b">
                    {loading ? <CircularProgress size={24} /> : stats.projects}
                  </Typography>
                  <Typography variant="body2" color="#64748b">Active Projects</Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  bgcolor: '#fff7ed',
                  borderLeft: '4px solid #f97316'
                }}
              >
                <Description sx={{ fontSize: 40, color: '#f97316' }} />
                <Box>
                  <Typography variant="h3" fontWeight={700} color="#1e293b">
                    {loading ? <CircularProgress size={24} /> : stats.requests}
                  </Typography>
                  <Typography variant="body2" color="#64748b">Pending Requests</Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Recent Activities — ADMIN only */}
          {isAdmin && (
            <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'white' }}>
              <Typography variant="h6" fontWeight={600} color="#1e293b" mb={2}>
                Recent Activities
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : activities.length > 0 ? (
                <Box>
                  {activities.map((activity, index) => (
                    <Box
                      key={activity.activity_log_id || index}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        py: 2,
                        borderBottom: index < activities.length - 1 ? '1px solid #f1f5f9' : 'none'
                      }}
                    >
                      <Box>
                        <Chip
                          label={activity.action.replace(/_/g, ' ')}
                          color={getActivityColor(activity.action)}
                          size="small"
                          sx={{ mb: 0.5 }}
                        />
                        <Typography variant="body2" color="#1e293b">
                          {renderActivityDetails(activity)}
                        </Typography>
                        {activity.user?.fullName && (
                          <Typography variant="caption" color="#64748b" display="block">
                            by {activity.user.fullName}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="#94a3b8">
                        {new Date(activity.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="#64748b" textAlign="center" py={4}>
                  No recent activities
                </Typography>
              )}
            </Paper>
          )}
        </Paper>
      </Box>

      {/* Add Announcement Dialog */}
      <Dialog open={announceDialogOpen} onClose={handleCloseAnnounce} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#0f172a' }}>Add Announcement</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, pt: 3 }}>
            <TextField
              label="Title"
              fullWidth
              value={announceForm.title}
              onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
            />
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={4}
              value={announceForm.content}
              onChange={(e) => setAnnounceForm({ ...announceForm, content: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseAnnounce}>Cancel</Button>
          <Button onClick={handleSubmitAnnounce} variant="contained" disabled={!announceForm.title || announceLoadingSubmit} sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 600 }}>
            {announceLoadingSubmit ? 'Posting...' : 'Post Announcement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
