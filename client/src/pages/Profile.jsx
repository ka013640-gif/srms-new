import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Box, Paper, CircularProgress, Grid, TextField,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, IconButton, Alert, Chip, Avatar, Divider
} from '@mui/material';
import {
  Camera, Person, Email, Badge, Home, CalendarToday,
  Phone, Work, Favorite, Transgender, Save, Close
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const fileLink = (p) => `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${p}`;

const Profile = () => {
  const { user, setUser } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editResidentOpen, setEditResidentOpen] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef(null);

  // ── Account form state ─────────────────────────────────────
  const [accForm, setAccForm] = useState({ fullName: '', email: '', password: '', profilePicture: '' });
  const [resForm, setResForm] = useState({
    full_name: '', age: 0, gender: '', birthday: '',
    address: '', contact: '', occupation: '', civil_status: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data } = await api.get('auth/me');
      const u = data.user;
      setAccForm(prev => ({
        ...prev,
        fullName: u.fullName || '',
        email: u.email || '',
        profilePicture: u.profilePicture || ''
      }));
      if (u.resident) {
        setResForm({
          full_name: u.resident.full_name || '',
          age: u.resident.age || 0,
          gender: u.resident.gender || '',
          birthday: u.resident.birthday ? new Date(u.resident.birthday).toISOString().split('T')[0] : '',
          address: u.resident.address || '',
          contact: u.resident.contact || '',
          occupation: u.resident.occupation || '',
          civil_status: u.resident.civil_status || ''
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // ── Auto-calculate age from birthday ────────────────────────
  useEffect(() => {
    if (resForm.birthday) {
      const birth = new Date(resForm.birthday);
      const today = new Date();
      let a = today.getFullYear() - birth.getFullYear();
      const md = today.getMonth() - birth.getMonth();
      if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) a--;
      setResForm(p => ({ ...p, age: a }));
    }
  }, [resForm.birthday]);

  // ── Account update ─────────────────────────────────────────
  const handleAccSubmit = async () => {
    setError('');
    try {
      const { data } = await api.put('users/profile', accForm);
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('Account updated.');
      setTimeout(() => setSuccess(''), 3500);
      setEditOpen(false);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update account');
      setTimeout(() => setError(''), 4000);
    }
  };

  // ── Profile picture upload ─────────────────────────────────
  const handlePictureSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('picture', f);
    api.post('users/profile/picture', fd)
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setAccForm(p => ({ ...p, profilePicture: data.user.profilePicture || '' }));
        setSuccess('Profile picture updated.');
        setTimeout(() => setSuccess(''), 3500);
      })
      .catch(e => {
        setError(e.response?.data?.error || 'Upload failed');
        setTimeout(() => setError(''), 4000);
      });
  };

  // ── Auto-calculate age for editingResident ─────────────────
  useEffect(() => {
    if (editingResident?.birthday) {
      const birth = new Date(editingResident.birthday);
      const today = new Date();
      let a = today.getFullYear() - birth.getFullYear();
      const md = today.getMonth() - birth.getMonth();
      if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) a--;
      setEditingResident(p => ({ ...p, age: a }));
    }
  }, [editingResident?.birthday]);

  // ── Resident update ─────────────────────────────────────────
  const openResidentEdit = () => {
    setEditingResident({ ...resForm });
    setEditResidentOpen(true);
  };
  const handleResidentSubmit = async () => {
    setError('');
    const r = editingResident;
    if (!r.full_name || !r.gender || !r.birthday || !r.address || !r.civil_status) {
      setError('Please fill in all required fields.'); return;
    }
    try {
      const residentId = user?.resident?.id;
      if (!residentId) {
        // No resident profile yet — create one
        await api.post('residents', r);
      } else {
        await api.put('residents/' + residentId, r);
      }
      setSuccess('Resident profile saved.');
      setTimeout(() => setSuccess(''), 3500);
      setEditResidentOpen(false);
      fetchData();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save resident profile');
      setTimeout(() => setError(''), 4000);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      {error   && <Alert severity="error"   sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Typography variant="h4" fontWeight={600} color="#1e293b" mb={3}>
        My Profile
      </Typography>

      {/* ── Profile Picture Header ──────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            src={accForm.profilePicture ? fileLink(accForm.profilePicture) : ''}
            sx={{
              width: 100, height: 100, bgcolor: '#1e293b', fontSize: '36px',
              border: '3px solid #e2e8f0'
            }}
          >
            {(!accForm.profilePicture) && (user?.fullName?.charAt(0) || 'U')}
          </Avatar>
          <IconButton
            size="small"
            onClick={() => fileRef.current?.click()}
            sx={{
              position: 'absolute', bottom: 0, right: 0,
              bgcolor: '#16a34a', color: 'white',
              '&:hover': { bgcolor: '#15803d' }
            }}
          >
            <Camera fontSize="small" />
          </IconButton>
          <input ref={fileRef} type="file" hidden accept="image/*" onChange={handlePictureSelect} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={600}>{user?.fullName}</Typography>
          <Typography variant="body1" color="#64748b">{user?.role}</Typography>
          <Typography variant="body2" color="#94a3b8">@{user?.username}</Typography>
        </Box>
      </Paper>

      {/* ── Admin: Account Information only ─────────────────── */}
      {isAdmin && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b">Account Information</Typography>
                <Button
                  size="small" variant="outlined" startIcon={<Save />}
                  onClick={() => { setAccForm(p => ({ ...p, fullName: user?.fullName || '', email: user?.email || '' })); setEditOpen(true); }}
                  sx={{ color: '#1e293b', borderColor: '#1e293b' }}
                >
                  Edit Profile
                </Button>
              </Box>

              <Grid container spacing={3}>
                {[
                  { icon: <Person />, label: 'Full Name',  value: user?.fullName },
                  { icon: <Badge />,  label: 'Username',   value: user?.username },
                  { icon: <Email />,  label: 'Email',      value: accForm.email || 'Not provided' },
                  { icon: <Camera />, label: 'Role',       value: user?.role },
                ].map(({ icon, label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ color: '#64748b' }}>{icon}</Box>
                      <Box>
                        <Typography variant="body2" color="#64748b">{label}</Typography>
                        <Typography variant="body1">{value}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Resident: split view ─────────────────────────────── */}
      {!isAdmin && (
        <Grid container spacing={3}>
          {/* Resident Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b">Resident Information</Typography>
              </Box>

              {user?.resident ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { icon: <Person />,       label: 'Full Name',  value: resForm.full_name },
                    { icon: <Transgender />,  label: 'Gender',     value: resForm.gender },
                    { icon: <CalendarToday />,label: 'Birthday',   value: resForm.birthday ? new Date(resForm.birthday).toLocaleDateString() : '—' },
                    { icon: <Badge />,        label: 'Age',        value: resForm.age },
                    { icon: <Home />,         label: 'Address',    value: resForm.address },
                    { icon: <Phone />,        label: 'Contact',    value: resForm.contact || '—' },
                    { icon: <Work />,         label: 'Occupation', value: resForm.occupation || '—' },
                    { icon: <Favorite />,     label: 'Civil Status',value: resForm.civil_status },
                  ].map(({ icon, label, value }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ color: '#64748b' }}>{icon}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="#64748b">{label}</Typography>
                        <Typography variant="body1">{value || '—'}</Typography>
                      </Box>
                    </Box>
                  ))}

                  <Divider sx={{ my: 1 }} />
                  <Button
                    size="small" variant="outlined"
                    startIcon={<Save />}
                    onClick={openResidentEdit}
                    sx={{ alignSelf: 'flex-start', color: '#16a34a', borderColor: '#16a34a' }}
                  >
                    Edit Resident Info
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body2" color="#64748b">
                    No resident profile linked to this account.
                  </Typography>
                  <Button
                    size="small" variant="outlined"
                    startIcon={<Save />}
                    onClick={openResidentEdit}
                    sx={{ alignSelf: 'flex-start', color: '#16a34a', borderColor: '#16a34a' }}
                  >
                    Create Resident Profile
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Account Information */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} color="#1e293b">Account Information</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { icon: <Person />,  label: 'Full Name', value: accForm.fullName },
                  { icon: <Badge />,   label: 'Username',  value: user?.username },
                  { icon: <Email />,   label: 'Email',     value: accForm.email || 'Not provided' },
                ].map(({ icon, label, value }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ color: '#64748b' }}>{icon}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="#64748b">{label}</Typography>
                      <Typography variant="body1">{value}</Typography>
                    </Box>
                  </Box>
                ))}
                <Divider sx={{ my: 1 }} />
                <Button
                  size="small" variant="outlined"
                  startIcon={<Save />}
                  onClick={() => { setAccForm(p => ({ ...p, fullName: user?.fullName || '', email: user?.email || '' })); setEditOpen(true); }}
                  sx={{ alignSelf: 'flex-start', color: '#1e293b', borderColor: '#1e293b' }}
                >
                  Edit Account
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Edit Account Dialog ───────────────────────────────┬─ */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Full Name" fullWidth
              value={accForm.fullName}
              onChange={(e) => setAccForm(p => ({ ...p, fullName: e.target.value }))}
            />
            <TextField
              label="Email" fullWidth type="email"
              value={accForm.email}
              onChange={(e) => setAccForm(p => ({ ...p, email: e.target.value }))}
            />
            <TextField
              label="New Password (leave blank to keep current)" fullWidth type="password"
              value={accForm.password}
              onChange={(e) => setAccForm(p => ({ ...p, password: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleAccSubmit} variant="contained" sx={{ bgcolor: '#1e293b' }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Resident Dialog ──────────────────────────────┴─ */}
      <Dialog open={editResidentOpen} onClose={() => setEditResidentOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Resident Information</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Full Name" fullWidth value={editingResident?.full_name || ''}
              onChange={(e) => setEditingResident(p => ({ ...p, full_name: e.target.value }))} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Birthday" type="date" fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={editingResident?.birthday || ''}
                  onChange={(e) => setEditingResident(p => ({ ...p, birthday: e.target.value }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Age" type="number" fullWidth InputProps={{ readOnly: true }}
                  value={editingResident?.age || 0} />
              </Grid>
            </Grid>
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select value={editingResident?.gender || ''} label="Gender"
                onChange={(e) => setEditingResident(p => ({ ...p, gender: e.target.value }))}>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Address" fullWidth value={editingResident?.address || ''}
              onChange={(e) => setEditingResident(p => ({ ...p, address: e.target.value }))} />
            <TextField label="Contact" fullWidth value={editingResident?.contact || ''}
              onChange={(e) => setEditingResident(p => ({ ...p, contact: e.target.value }))} />
            <TextField label="Occupation" fullWidth value={editingResident?.occupation || ''}
              onChange={(e) => setEditingResident(p => ({ ...p, occupation: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>Civil Status</InputLabel>
              <Select value={editingResident?.civil_status || ''} label="Civil Status"
                onChange={(e) => setEditingResident(p => ({ ...p, civil_status: e.target.value }))}>
                <MenuItem value="Single">Single</MenuItem>
                <MenuItem value="Married">Married</MenuItem>
                <MenuItem value="Widowed">Widowed</MenuItem>
                <MenuItem value="Separated">Separated</MenuItem>
                <MenuItem value="Divorced">Divorced</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditResidentOpen(false)}>Cancel</Button>
          <Button onClick={handleResidentSubmit} variant="contained" sx={{ bgcolor: '#1e293b' }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
