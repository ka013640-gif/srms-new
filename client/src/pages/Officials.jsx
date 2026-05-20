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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600} color="#1e293b">
          Barangay Officials
        </Typography>
        {user?.role === 'ADMIN' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
            sx={{ bgcolor: '#1e293b', '&:hover': { bgcolor: '#334155' } }}
          >
            Add Official
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Term Start</TableCell>
              <TableCell>Term End</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {officials.map((official) => (
              <TableRow key={official.id} hover sx={{ opacity: official.is_active ? 1 : 0.55 }}>
                <TableCell>{official.name}</TableCell>
                <TableCell>{official.position}</TableCell>
                <TableCell>{official.contact || '-'}</TableCell>
                <TableCell>{new Date(official.term_start).toLocaleDateString()}</TableCell>
                <TableCell>{official.term_end ? new Date(official.term_end).toLocaleDateString() : 'Ongoing'}</TableCell>
                <TableCell>
                  <Chip
                    label={official.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={official.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {user?.role === 'ADMIN' ? (
                    <>
                      <IconButton size="small" onClick={() => handleOpen(official)}>
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
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Official' : 'Add New Official'}</DialogTitle>
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
