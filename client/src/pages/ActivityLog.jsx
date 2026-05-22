import { useState, useEffect, useMemo } from 'react';
import {
  Typography, Box, Paper, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Checkbox,
  Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { AccountCircle, Delete as DeleteIcon, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import api from '../services/api';

const ActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await api.get('activity/log');
      setActivities(response.data.activities || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const allIds = useMemo(() => activities.map(a => a.activity_log_id), [activities]);
  const allChecked = activities.length > 0 && selected.length === allIds.length;
  const someChecked = selected.length > 0 && selected.length < allIds.length;

  const handleToggleAll = () => {
    if (allChecked || someChecked) {
      setSelected([]);
    } else {
      setSelected(allIds);
    }
  };

  const handleToggleOne = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteClick = () => {
    if (selected.length === 0) return;
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete('activity/log', { data: { ids: selected } });
      showMessage(`${selected.length} log(s) deleted`, 'success');
      setDeleteOpen(false);
      setSelected([]);
      fetchActivities();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to delete logs', 'error');
      setDeleteOpen(false);
    }
  };

  const renderDetails = (details) => {
    if (!details) return '-';
    try {
      const parsed = JSON.parse(details);
      if (typeof parsed === 'object') {
        return Object.entries(parsed).map(([key, value]) => `${key}: ${value}`).join(', ');
      }
      return details;
    } catch {
      return details;
    }
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return 'success';
    if (action.includes('UPDATE')) return 'info';
    if (action.includes('DELETE')) return 'error';
    return 'default';
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
          Activity Log
        </Typography>
        {selected.length > 0 && (
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteClick}
            sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
          >
            Delete Selected ({selected.length})
          </Button>
        )}
      </Box>

      {message && (
        <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someChecked}
                  checked={allChecked}
                  onChange={handleToggleAll}
                  icon={<CheckBoxOutlineBlank />}
                  indeterminateIcon={<CheckBox />}
                />
              </TableCell>
              <TableCell width="16%">User</TableCell>
              <TableCell width="16%">Action</TableCell>
              <TableCell width="35%">Details</TableCell>
              <TableCell width="25%">Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                  No activities recorded
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.activity_log_id} hover selected={selected.includes(activity.activity_log_id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(activity.activity_log_id)}
                      onChange={() => handleToggleOne(activity.activity_log_id)}
                      icon={<CheckBoxOutlineBlank />}
                      checkedIcon={<CheckBox />}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountCircle fontSize="small" color="action" />
                      {activity.user?.fullName || activity.user?.username || 'Unknown'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={activity.action} color={getActionColor(activity.action)} size="small" />
                  </TableCell>
                  <TableCell>{renderDetails(activity.details)}</TableCell>
                  <TableCell>
                    {new Date(activity.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirm Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Activity Logs</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{selected.length}</strong> selected activity log(s)? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActivityLog;
