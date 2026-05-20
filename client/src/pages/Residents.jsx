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
  Alert,
  Chip,
  Grid,
  Pagination
} from '@mui/material';
import { Add, Edit, Delete, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import api from '../services/api';

const Residents = () => {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [formData, setFormData] = useState({
    full_name: '',
    birthday: '',
    age: 0,
    gender: '',
    address: '',
    contact: '',
    occupation: '',
    civil_status: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchResidents();
  }, [page, sortField, sortOrder]);

  const fetchResidents = async () => {
    try {
      const params = new URLSearchParams({
        page,
        limit: 50,
        sortBy: sortField,
        sortOrder
      });
      const response = await api.get(`residents?${params}`);
      setResidents(response.data.residents || response.data);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleOpen = (resident = null) => {
    if (resident) {
      setEditing(resident);
      const birth = resident.birthday?.split('T')[0] || resident.birthdate?.split('T')[0] || '';
      const today = new Date();
      const birthDate = new Date(birth);
      let age = 0;
      if (birth) {
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
      setFormData({
        full_name: resident.full_name,
        age: age,
        gender: resident.gender,
        birthday: birth,
        address: resident.address,
        contact: resident.contact || '',
        occupation: resident.occupation || '',
        civil_status: resident.civil_status,
        status: resident.status
      });
    } else {
      setEditing(null);
      setFormData({
        full_name: '',
        age: 0,
        gender: '',
        birthday: '',
        address: '',
        contact: '',
        occupation: '',
        civil_status: '',
        status: 'Active'
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
      setError('');
      const submitData = {
        full_name: formData.full_name,
        birthday: formData.birthday,
        age: formData.age,
        gender: formData.gender,
        address: formData.address,
        contact: formData.contact,
        occupation: formData.occupation,
        civil_status: formData.civil_status,
        status: formData.status
      };
      if (editing) {
        await api.put(`residents/${editing.resident_id}`, submitData);
      } else {
        await api.post('residents', submitData);
      }
      handleClose();
      fetchResidents();
    } catch (error) {
      console.error('Failed to save resident:', error);
      setError(error.response?.data?.error || 'Failed to save resident');
    }
  };

  const handleDelete = async (id) => {
     if (window.confirm('Are you sure you want to delete this resident?')) {
       try {
         await api.delete(`residents/${id}`);
         if (residents.length === 1 && page > 1) {
           setPage(page - 1);
         } else {
           fetchResidents();
         }
       } catch (error) {
         console.error('Failed to delete resident:', error);
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

  const SortIndicator = ({ field }) => (
    sortField === field && (sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />)
  );

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600} color="#1e293b">
          Residents Database
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
        >
          Add Resident
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell 
                onClick={() => handleSort('full_name')}
                sx={{ cursor: 'pointer', fontWeight: 600, width: '25%' }}
              >
                Name <SortIndicator field="full_name" />
              </TableCell>
              <TableCell 
                onClick={() => handleSort('age')}
                sx={{ cursor: 'pointer', fontWeight: 600, width: '10%' }}
              >
                Age <SortIndicator field="age" />
              </TableCell>
              <TableCell 
                onClick={() => handleSort('gender')}
                sx={{ cursor: 'pointer', fontWeight: 600, width: '15%' }}
              >
                Gender <SortIndicator field="gender" />
              </TableCell>
              <TableCell 
                onClick={() => handleSort('status')}
                sx={{ cursor: 'pointer', fontWeight: 600, width: '15%' }}
              >
                Status <SortIndicator field="status" />
              </TableCell>
              <TableCell sx={{ fontWeight: 600, width: '20%' }}>Address</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '10%' }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '5%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {residents.map((resident) => (
              <TableRow key={resident.resident_id} hover>
                <TableCell>{resident.full_name}</TableCell>
                <TableCell>{resident.age}</TableCell>
                <TableCell>{resident.gender}</TableCell>
                <TableCell>
                  <Chip
                    label={resident.status}
                    size="small"
                    color={resident.status === 'Active' ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>{resident.address}</TableCell>
                <TableCell>{resident.contact || '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpen(resident)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(resident.resident_id)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Edit Resident' : 'Add New Resident'}</DialogTitle>
          <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Birthday"
                  type="date"
                  fullWidth
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Age"
                  type="number"
                  fullWidth
                  value={formData.age}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                value={formData.gender}
                label="Gender"
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Address"
              fullWidth
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <TextField
              label="Contact"
              fullWidth
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
            <TextField
              label="Occupation"
              fullWidth
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Civil Status</InputLabel>
              <Select
                value={formData.civil_status}
                label="Civil Status"
                onChange={(e) => setFormData({ ...formData, civil_status: e.target.value })}
              >
                <MenuItem value="Single">Single</MenuItem>
                <MenuItem value="Married">Married</MenuItem>
                <MenuItem value="Widowed">Widowed</MenuItem>
                <MenuItem value="Separated">Separated</MenuItem>
                <MenuItem value="Divorced">Divorced</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
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

export default Residents;