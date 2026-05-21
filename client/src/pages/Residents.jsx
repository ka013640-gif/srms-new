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

  // Add Account dialog state
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accountCreateError, setAccountCreateError] = useState('');

  // Full account form state
  const calculateAge = (birthday) => {
    if (!birthday) return 0;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const [accountForm, setAccountForm] = useState({
    fullname: '',
    username: '',
    password: '',
    email: '',
    birthday: '',
    gender: '',
    address: '',
    contact: '',
    occupation: '',
    civil_status: '',
    accountType: 'resident',
    position: '',
    term_start: '',
    term_end: ''
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

  // ── Add Account handlers ──

  const handleOpenAddAccount = () => {
    setAccountForm({
      fullname: '',
      username: '',
      password: '',
      email: '',
      birthday: '',
      gender: '',
      address: '',
      contact: '',
      occupation: '',
      civil_status: '',
      accountType: 'resident',
      position: '',
      term_start: '',
      term_end: ''
    });
    setAccountCreateError('');
    setAddAccountOpen(true);
  };

  const handleCloseAddAccount = () => {
    setAddAccountOpen(false);
    setAccountForm({
      fullname: '', username: '', password: '', email: '', birthday: '',
      gender: '', address: '', contact: '', occupation: '', civil_status: '',
      accountType: 'resident', position: '', term_start: '', term_end: ''
    });
    setAccountCreateError('');
  };

  const handleAccountTypeChange = (e) => {
    const type = e.target.value;
    setAccountForm({
      ...accountForm,
      accountType: type,
      occupation: type === 'official' ? 'Barangay Official' : accountForm.occupation
    });
  };

  const handleAccountBirthdayChange = (e) => {
    const birthday = e.target.value;
    setAccountForm({ ...accountForm, birthday });
  };

  const handleAccountSubmit = async () => {
    try {
      setAccountCreateError('');

      const payload = {
        fullname: accountForm.fullname,
        username: accountForm.username,
        password: accountForm.password,
        email: accountForm.email,
        birthday: accountForm.birthday,
        gender: accountForm.gender,
        address: accountForm.address,
        contact: accountForm.contact,
        occupation: accountForm.occupation,
        civil_status: accountForm.civil_status,
        accountType: accountForm.accountType,
        status: 'Active',
        position: accountForm.position,
        term_start: accountForm.term_start,
        term_end: accountForm.term_end
      };

      await api.post('auth/create-account', payload);

      handleCloseAddAccount();
      fetchResidents();
    } catch (error) {
      console.error('Failed to create account:', error);
      setAccountCreateError(error.response?.data?.error || 'Failed to create account');
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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAddAccount}
          sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
        >
          Add Account
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
                   onChange={(e) => {
                     const birthday = e.target.value;
                     let age = 0;
                     if (birthday) {
                       const today = new Date();
                       const birthDate = new Date(birthday);
                       age = today.getFullYear() - birthDate.getFullYear();
                       const monthDiff = today.getMonth() - birthDate.getMonth();
                       if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                         age--;
                       }
                     }
                     setFormData({ ...formData, birthday, age });
                   }}
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

      {/* Add Account Dialog */}
      <Dialog open={addAccountOpen} onClose={handleCloseAddAccount} maxWidth="sm" fullWidth>
        <DialogTitle>Create Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Account Type toggle */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant={accountForm.accountType === 'resident' ? 'contained' : 'outlined'}
                onClick={() => handleAccountTypeChange({ target: { value: 'resident' } })}
                sx={{ flex: 1, bgcolor: accountForm.accountType === 'resident' ? '#3b82f6' : 'transparent' }}
              >
                Resident
              </Button>
              <Button
                variant={accountForm.accountType === 'official' ? 'contained' : 'outlined'}
                onClick={() => handleAccountTypeChange({ target: { value: 'official' } })}
                sx={{ flex: 1, bgcolor: accountForm.accountType === 'official' ? '#16a34a' : 'transparent' }}
              >
                Barangay Official
              </Button>
            </Box>

            <TextField
              label="Full Name"
              fullWidth
              value={accountForm.fullname}
              onChange={(e) => setAccountForm({ ...accountForm, fullname: e.target.value })}
            />
            <TextField
              label="Username"
              fullWidth
              value={accountForm.username}
              onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={accountForm.password}
              onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={accountForm.email}
              onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Birthday"
                type="date"
                sx={{ flex: 2 }}
                value={accountForm.birthday}
                onChange={handleAccountBirthdayChange}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Age"
                type="number"
                sx={{ flex: 1 }}
                value={calculateAge(accountForm.birthday)}
                InputProps={{ readOnly: true }}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                value={accountForm.gender}
                label="Gender"
                onChange={(e) => setAccountForm({ ...accountForm, gender: e.target.value })}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Address"
              fullWidth
              value={accountForm.address}
              onChange={(e) => setAccountForm({ ...accountForm, address: e.target.value })}
            />
            <TextField
              label="Contact"
              fullWidth
              value={accountForm.contact}
              onChange={(e) => setAccountForm({ ...accountForm, contact: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Civil Status</InputLabel>
              <Select
                value={accountForm.civil_status}
                label="Civil Status"
                onChange={(e) => setAccountForm({ ...accountForm, civil_status: e.target.value })}
              >
                <MenuItem value="Single">Single</MenuItem>
                <MenuItem value="Married">Married</MenuItem>
                <MenuItem value="Widowed">Widowed</MenuItem>
                <MenuItem value="Separated">Separated</MenuItem>
                <MenuItem value="Divorced">Divorced</MenuItem>
              </Select>
            </FormControl>

            {accountForm.accountType === 'official' && (
              <Box sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: '#f0fdf4',
                border: '1px solid #86efac',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                <Typography variant="body1" fontWeight={600} color="#15803d">
                  Barangay Official Details
                </Typography>
                <TextField
                  label="Occupation"
                  fullWidth
                  value={accountForm.occupation}
                  InputProps={{ readOnly: true }}
                  helperText="Auto-set for officials"
                />
                <TextField
                  label="Position"
                  fullWidth
                  value={accountForm.position}
                  onChange={(e) => setAccountForm({ ...accountForm, position: e.target.value })}
                  helperText="e.g. Barangay Captain, Kagawad, Secretary"
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Term Start"
                    type="date"
                    sx={{ flex: 1 }}
                    value={accountForm.term_start}
                    onChange={(e) => setAccountForm({ ...accountForm, term_start: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Term End"
                    type="date"
                    sx={{ flex: 1 }}
                    value={accountForm.term_end}
                    onChange={(e) => setAccountForm({ ...accountForm, term_end: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddAccount}>Cancel</Button>
          <Button onClick={handleAccountSubmit} variant="contained" sx={{ bgcolor: '#1e293b' }}>
            Create Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Residents;