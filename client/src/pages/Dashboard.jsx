import { useState, useEffect } from 'react';
import { Typography, Box, Grid, Paper, CircularProgress, Chip, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
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
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);

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

      if (user) {
        try {
          const annRes = await api.get('announcements');
          const active = (annRes.data.announcements || []).filter(a => !a.deleted_at);
          setAnnouncements(active);
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
    setEditingAnnouncementId(null);
    setAnnounceForm({ title: '', content: '' });
    setAnnounceDialogOpen(true);
  };
  const handleCloseAnnounce = () => {
    setAnnounceDialogOpen(false);
    setEditingAnnouncementId(null);
    setAnnounceForm({ title: '', content: '' });
  };

  const handleOpenEdit = (a) => {
    setEditingAnnouncementId(a.announcement_id);
    setAnnounceForm({ title: a.title, content: a.content || '' });
    setAnnounceDialogOpen(true);
  };

  const handleSubmitAnnounce = async () => {
    try {
      setAnnounceLoadingSubmit(true);
      if (editingAnnouncementId) {
        await api.put(`announcements/${editingAnnouncementId}`, { ...announceForm, content: announceForm.content || '' });
      } else {
        await api.post('announcements', { ...announceForm, content: announceForm.content || '' });
      }
      const annRes = await api.get('announcements');
      setAnnouncements((annRes.data.announcements || []).filter(a => !a.deleted_at));
      handleCloseAnnounce();
    } catch (err) {
      console.error('Failed to save announcement:', err);
    } finally {
      setAnnounceLoadingSubmit(false);
    }
  };

  const handleDeleteAnnounce = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement? It will be moved to the archive.')) return;
    try {
      await api.delete(`announcements/${id}`);
      const annRes = await api.get('announcements');
      setAnnouncements((annRes.data.announcements || []).filter(a => !a.deleted_at));
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

   return (
    <Box>
      {/* ── Topbar ── */}
      <Box
        sx={{
          background: 'white',
          px: 4,
          py: 2.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15,23,42,.05)',
        }}
      >
        <Typography variant="h5" fontWeight={700} color="#0f172a" letterSpacing={-.3}>
          BARANGAY INFORMATION
          <Box component="span" display="block" sx={{ fontSize: '13px', fontWeight: 400, color: '#64748b', mt: 0.25 }}>
            Management System
          </Box>
        </Typography>
        <Box
          component="button"
          onClick={() => navigate(0)}
          sx={{
            bgcolor: '#0f172a',
            color: 'white',
            px: 2.5,
            py: 1,
            borderRadius: 1.5,
            fontWeight: 600,
            fontSize: '13px',
            letterSpacing: '.3px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background .15s',
            '&:hover': { bgcolor: '#1e293b' },
          }}
        >
          ⌂ &nbsp;HOME
        </Box>
      </Box>

      <Box sx={{ p: 3.5 }}>
        <Paper sx={{ p: 5, borderRadius: 3, boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
          <Typography variant="h5" fontWeight={700} color="#0f172a" mb={0.5}>
            Welcome back, {user?.fullName?.split(' ')[0] || user?.fullName || 'User'}
          </Typography>
          <Typography variant="body2" color="#64748b" mb={4}>
            Use the sidebar to navigate through the system modules.          
          </Typography>

          {/* Stats Cards */}
          <Grid container spacing={3} mb={4}>
            {[
              { Icon: People,     label: 'Active Residents', value: stats.residents, color: '#3b82f6',   bg: '#eff6ff', border: '#3b82f6' },
              { Icon: FolderOpen, label: 'Active Projects',  value: stats.projects,  color: '#16a34a',   bg: '#f0fdf4', border: '#16a34a' },
              { Icon: Description,label: 'Pending Requests', value: stats.requests,  color: '#f97316',   bg: '#fff7ed', border: '#f97316' },
            ].map(({ Icon, label, value, color, bg, border }) => (
              <Grid item xs={12} md={4} key={label}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: bg,
                    borderLeft: `4px solid ${border}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                    transition: 'box-shadow .2s, transform .15s',
                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,.08)', transform: 'translateY(-2px)' },
                  }}
                >
                  <Icon sx={{ fontSize: 38, color }} />
                  <Box>
                    <Typography variant="h3" fontWeight={800} color="#0f172a" lineHeight={1.2}>
                      {loading ? <CircularProgress size={22} thickness={5} sx={{ color }} /> : value}
                    </Typography>
                    <Typography variant="body2" color="#64748b" sx={{ mt: 0.25, fontWeight: 500 }}>{label}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Announcements */}
          <Box mb={4}>
            <Typography variant="h6" fontWeight={600} color="#1e293b" mb={2}>
              Announcements
            </Typography>
            {announceLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : announcements.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {announcements.map((a) => (
                  <Paper key={a.announcement_id} sx={{ p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      {/* Left: content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
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
                      </Box>

                      {/* Right: edit / delete — ADMIN/OFFICIAL only */}
                      {isOfficialOrAdmin && (
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 2, flexShrink: 0 }}>
                          <IconButton size="small" onClick={() => handleOpenEdit(a)} color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteAnnounce(a.announcement_id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="#64748b" textAlign="center" py={3}>
                No announcements yet
              </Typography>
            )}

            {/* Add Announcement — ADMIN/OFFICIAL only */}
            {isOfficialOrAdmin && !announceLoading && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAnnounce}
                  sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 600, borderRadius: 1.5, px: 2.5, py: 1 }}
                >
                  Add Announcement
                </Button>
              </Box>
            )}
          </Box>

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
        <DialogTitle sx={{ fontWeight: 700, color: '#0f172a' }}>
          {editingAnnouncementId ? 'Edit Announcement' : 'Add Announcement'}
        </DialogTitle>
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
            {announceLoadingSubmit ? 'Saving...' : editingAnnouncementId ? 'Save Changes' : 'Post Announcement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
