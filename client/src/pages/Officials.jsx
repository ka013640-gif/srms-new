import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import { Add, Edit, Delete } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Officials = () => {
  const { user } = useAuth();
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    contact: '',
    term_start: '',
    term_end: '',
    is_active: true
  });

  useEffect(() => {
    fetchOfficials();
  }, []);

  const fetchOfficials = async () => {
    try {
      const response = await api.get('officials');
      setOfficials(response.data.officials);
    } catch (error) {
      console.error('Failed to fetch officials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (official = null) => {
    if (official) {
      setEditing(official);
      setFormData({
        name: official.name,
        position: official.position,
        contact: official.contact || '',
        term_start: official.term_start?.split('T')[0],
        term_end: official.term_end?.split('T')[0],
        is_active: official.is_active
      });
    } else {
      setEditing(null);
      setFormData({
        name: '',
        position: '',
        contact: '',
        term_start: '',
        term_end: '',
        is_active: true
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await api.put(`officials/${editing.official_id}`, formData);
      } else {
        await api.post('officials', formData);
      }
      handleClose();
      fetchOfficials();
    } catch (error) {
      console.error('Failed to save official:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this official?')) {
      try {
        await api.delete(`officials/${id}`);
        fetchOfficials();
      } catch (error) {
        console.error('Failed to delete official:', error);
      }
    }
  };

  const formatDate = (val) => val ? new Date(val).toLocaleDateString() : '—';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#0f172a">
            Barangay Officials
          </Typography>
          <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>
            Manage elected and appointed barangay officials
          </Typography>
        </Box>
        {user?.role === 'ADMIN' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
            sx={{
              bgcolor: '#1e293b', color: 'white', borderRadius: 1.5,
              boxShadow: 'none', fontWeight: 600, px: 2, py: 0.75, fontSize: '13px',
              '&:hover': { bgcolor: '#0f172a', boxShadow: '0 4px 12px rgba(15,23,42,.25)' },
            }}
          >
            Add Official
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(15,23,42,.06)', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '12px', letterSpacing: '.3px', textTransform: 'uppercase' }}>
                Name
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '12px', letterSpacing: '.3px', textTransform: 'uppercase' }}>
                Position
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '12px', letterSpacing: '.3px', textTransform: 'uppercase' }}>
                Contact
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '12px', letterSpacing: '.3px', textTransform: 'uppercase' }}>
                Term Start
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '12px', letterSpacing: '.3px', textTransform: 'uppercase' }}>
                Term End
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '12px', letterSpacing: '.3px', textTransform: 'uppercase' }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '12px', letterSpacing: '.3px', textTransform: 'uppercase', width: '5%' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {officials.map((official, idx) => (
              <TableRow
                key={official.id}
                hover
                sx={{
                  '& td': { borderBottom: idx < officials.length - 1 ? '1px solid #f1f5f9' : 'none' },
                  transition: 'background .12s',
                  opacity: official.is_active ? 1 : 0.55,
                }}
              >
                <TableCell sx={{ color: '#1e293b', fontWeight: 500 }}>{official.name}</TableCell>
                <TableCell sx={{ color: '#475569' }}>{official.position}</TableCell>
                <TableCell sx={{ color: '#475569' }}>{official.contact || '-'}</TableCell>
                <TableCell sx={{ color: '#475569' }}>{formatDate(official.term_start)}</TableCell>
                <TableCell sx={{ color: '#475569' }}>{official.term_end ? formatDate(official.term_end) : 'Ongoing'}</TableCell>
                <TableCell>
                  <Chip
                    label={official.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '11px',
                      letterSpacing: '.3px',
                      bgcolor: official.is_active ? '#dcfce7' : '#f1f5f9',
                      color: official.is_active ? '#16a34a' : '#64748b',
                    }}
                  />
                </TableCell>
                <TableCell>
                  {user?.role === 'ADMIN' ? (
                    <>
                      <IconButton size="small" onClick={() => handleOpen(official)} sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#1e293b' } }}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(official.official_id)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? 'Edit Official' : 'Add New Official'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Position"
              fullWidth
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
            <TextField
              label="Contact"
              fullWidth
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
            <TextField
              label="Term Start"
              type="date"
              fullWidth
              value={formData.term_start}
              onChange={(e) => setFormData({ ...formData, term_start: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Term End"
              type="date"
              fullWidth
              value={formData.term_end}
              onChange={(e) => setFormData({ ...formData, term_end: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Active</InputLabel>
              <Select
                value={formData.is_active.toString()}
                label="Active"
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#1e293b' }}>
            {editing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Officials;