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
  CircularProgress,
  IconButton,
  Alert,
  Chip
} from '@mui/material';
import { Restore, DeleteForever } from '@mui/icons-material';
import api from '../services/api';

const Archives = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      const response = await api.get('archives');
      setArchives(response.data.archives || []);
    } catch (error) {
      console.error('Failed to fetch archives:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRestore = async (id, entityType) => {
    if (window.confirm('Are you sure you want to restore this entry?')) {
      try {
        await api.post(`archives/${id}/restore`);
        fetchArchives();
        showMessage('Entry restored successfully', 'info');
      } catch (error) {
        console.error('Failed to restore entry:', error);
        showMessage('Failed to restore entry', 'error');
      }
    }
  };

  const handlePermanentDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this entry? This action cannot be undone.')) {
      try {
        await api.delete(`archives/${id}/permanent`);
        fetchArchives();
        showMessage('Entry permanently deleted', 'info');
      } catch (error) {
        console.error('Failed to permanently delete entry:', error);
        showMessage('Failed to delete entry', 'error');
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

  const getEntityTypeLabel = (type) => {
    switch (type) {
      case 'RESIDENT': return { label: 'Resident', color: 'primary' };
      case 'PROJECT': return { label: 'Project', color: 'secondary' };
      case 'SESSION': return { label: 'Session', color: 'success' };
      default: return { label: type, color: 'default' };
    }
  };

  const renderEntityDetails = (entry) => {
    switch (entry.entity_type) {
      case 'RESIDENT':
        return entry.full_name;
      case 'PROJECT':
        return entry.name;
      case 'SESSION':
        return entry.title;
      default:
        return 'Unknown';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600} color="#1e293b">
          Archives
        </Typography>
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
              <TableCell>Entity Type</TableCell>
              <TableCell>Entity Details</TableCell>
              <TableCell>Deleted At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {archives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                  No archived entries
                </TableCell>
              </TableRow>
            ) : (
              archives.map((entry) => (
                <TableRow key={`${entry.entity_type}-${entry.entity_type === 'RESIDENT' ? entry.resident_id : entry.entity_type === 'PROJECT' ? entry.project_id : entry.session_id}`} hover>
                  <TableCell>
                    <Chip
                      label={getEntityTypeLabel(entry.entity_type).label}
                      color={getEntityTypeLabel(entry.entity_type).color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{renderEntityDetails(entry)}</TableCell>
                  <TableCell>{new Date(entry.deleted_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleRestore(entry.entity_type === 'RESIDENT' ? entry.resident_id : entry.entity_type === 'PROJECT' ? entry.project_id : entry.session_id, entry.entity_type)} color="primary">
                      <Restore fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handlePermanentDelete(entry.entity_type === 'RESIDENT' ? entry.resident_id : entry.entity_type === 'PROJECT' ? entry.project_id : entry.session_id)} color="error">
                      <DeleteForever fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Archives;