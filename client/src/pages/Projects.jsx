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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip
} from '@mui/material';
import { Add, Edit, Delete, Description, CalendarMonth, AccountBalanceWallet } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_ACCENT = {
  ACTIVE:      { color: '#16a34a', bg: 'rgba(22,163,74,.12)' },
  PLANNING:    { color: '#0369a1', bg: 'rgba(3,105,161,.12)' },
  COMPLETED:   { color: '#475569', bg: 'rgba(71,85,105,.12)' },
  CANCELLED:   { color: '#dc2626', bg: 'rgba(220,38,38,.12)' },
};

const STATUS_LABEL = {
  ACTIVE:    '#dcfce7',
  PLANNING:  '#e0f2fe',
  COMPLETED: '#f1f5f9',
  CANCELLED: '#fee2e2',
};

const Projects = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'PLANNING',
    budget: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (project = null) => {
    if (project) {
      setEditing(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        budget: project.budget?.toString() || '',
        start_date: project.start_date?.split('T')[0],
        end_date: project.end_date?.split('T')[0]
      });
    } else {
      setEditing(null);
      setFormData({ name: '', description: '', status: 'PLANNING', budget: '', start_date: '', end_date: '' });
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditing(null); };

  const handleSubmit = async () => {
    try {
      if (!isAdmin) return;
      const submitData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date ? `${formData.start_date}T00:00:00.000Z` : null,
        end_date:   formData.end_date   ? `${formData.end_date}T00:00:00.000Z`   : null,
      };
      if (editing) {
        await api.put(`projects/${editing.project_id}`, submitData);
      } else {
        await api.post('projects', submitData);
      }
      handleClose();
      fetchProjects();
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`projects/${id}`);
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const formatCurrency = (val) => val ? `₱${Number(val).toLocaleString()}` : 'N/A';
  const formatDate = (val) => val ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  const getAccent = (status) => STATUS_ACCENT[status] || STATUS_ACCENT.PLANNING;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0f172a">Community Projects</Typography>
          <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>Manage all barangay community initiatives</Typography>
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
            Create Project
          </Button>
        )}
      </Box>

      {!projects.length ? (
        <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
          <Description sx={{ fontSize: 56, mb: 2, opacity: .3 }} />
          <Typography variant="h6" color="#64748b">No projects yet</Typography>
          <Typography variant="body2" color="#94a3b8" sx={{ mt: 1 }}>Create your first project to get started</Typography>
        </Box>
      ) : (
      <Grid container spacing={3}>
        {projects.map((project) => {
          const accent = getAccent(project.status);
          return (
            <Grid item xs={12} sm={6} md={4} key={project.project_id}>
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
                  {/* Header row */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Box sx={{
                        width: 34, height: 34, borderRadius: 1.5,
                        bgcolor: accent.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Description sx={{ fontSize: 16, color: accent.color }} />
                      </Box>
                      <Typography variant="h6" fontWeight={700} color="#1e293b" sx={{ fontSize: '1rem', lineHeight: 1.3 }}>
                        {project.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={project.status}
                      size="small"
                      sx={{
                        bgcolor: STATUS_LABEL[project.status] || '#f1f5f9',
                        color: accent.color,
                        fontWeight: 600,
                        fontSize: '0.68rem',
                        height: 22,
                        flexShrink: 0,
                      }}
                    />
                  </Box>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    color="#64748b"
                    sx={{ mb: 2, minHeight: 38, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}
                  >
                    {project.description || '—'}
                  </Typography>

                  {/* Spacer */}
                  <Box sx={{ flex: 1 }} />

                  {/* Meta rows */}
                  <Box
                    sx={{
                      display: 'flex', flexDirection: 'column', gap: 0.75,
                      pt: 1.5,
                      borderTop: '1px solid #f1f5f9',
                      mb: isAdmin ? 1.5 : 0,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalanceWallet sx={{ fontSize: 15, color: '#94a3b8', flexShrink: 0 }} />
                      <Typography variant="body2" color="#475569" sx={{ fontSize: '0.8rem' }}>
                        {formatCurrency(project.budget)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarMonth sx={{ fontSize: 15, color: '#94a3b8', flexShrink: 0 }} />
                      <Typography variant="body2" color="#475569" sx={{ fontSize: '0.8rem' }}>
                        {formatDate(project.start_date)} &ndash; {formatDate(project.end_date)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Actions */}
                  {isAdmin && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(project)}
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
                        onClick={() => handleDelete(project.project_id)}
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
          {editing ? 'Edit Project' : 'Create New Project'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            <TextField label="Project Name" fullWidth value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <TextField label="Description" fullWidth multiline rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={formData.status} label="Status" onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <MenuItem value="PLANNING">Planning</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Budget (₱)" type="number" fullWidth value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} />
            <TextField label="Start Date" type="date" fullWidth value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" fullWidth value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#1e293b', textTransform: 'none', fontWeight: 600, borderRadius: 1.5, px: 2.5 }}>
            {editing ? 'Update Project' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;
