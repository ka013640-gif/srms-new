import React, { useState, useEffect, useCallback } from 'react';
import {
  FormControl, InputLabel, Select, MenuItem,
  Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress, Chip, Divider, Collapse, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Add, Close, ExpandMore, ExpandLess, Description,
  Download, CheckCircle, Cancel as CancelIcon,
  Send as SendIcon, Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Documents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (user?.role === 'OFFICIAL') {
      navigate('/dashboard', { replace: true });
    }
  }, [user]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRequest, setOpenRequest] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingAdminFor, setUploadingAdminFor] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [formData, setFormData] = useState({ type: '', purpose: '' });

  const getStatusColor = (s) => ({ PENDING:'warning', APPROVED:'success', REJECTED:'error', RELEASED:'info', CANCELLED:'default' }[s] || 'default');
  const isViewableFile = (name='') => ['png','jpg','jpeg','gif','bmp','webp','svg','pdf','txt'].includes(name.split('.').pop().toLowerCase());
  const fileLink = (p) => `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${p}`;
  const alert = (type, text) => { setError(type==='error'?text:''); setSuccess(type==='success'?text:''); if(type==='success') setTimeout(()=>setSuccess(''),3500); if(type==='error') setTimeout(()=>setError(''),4000); };

  const fetchRequests = async () => {
    try { const { data } = await api.get('documents'); setRequests(data.requests); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchRequests(); }, []);

  const handleStatusUpdate = async (id, status, notes) => {
    try { await api.put(`documents/${id}/status`, notes ? { status, notes } : { status }); alert('success','Status updated.'); fetchRequests(); }
    catch (e) { alert('error', e.response?.data?.error || 'Failed to update status'); }
  };
  const handleCancel = async (req) => {
    await handleStatusUpdate(req.document_request_id, 'CANCELLED');
  };

  const handleDeleteAttachment = async (requestId, attachId) => {
    try { await api.delete(`documents/${requestId}/attachments/${attachId}`); alert('success','Attachment removed.'); }
    catch (e) { alert('error', e.response?.data?.error || 'Failed to remove attachment'); }
    await fetchRequests();
  };
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to archive this document request?')) {
      try {
        await api.delete(`documents/${id}`);
        fetchRequests();
        alert('success','Request archived.');
      } catch (e) {
        alert('error', e.response?.data?.error || 'Failed to archive request');
      }
    }
  };
  const handleRejectOpen = (req) => { setRejectTarget(req); setRejectNote(''); setRejectOpen(true); };
  const handleRejectSubmit = async () => { if (!rejectTarget) return; await handleStatusUpdate(rejectTarget.document_request_id,'REJECTED',rejectNote); setRejectOpen(false); setRejectTarget(null); setRejectNote(''); };

  const handleOpenRequest = () => { setFormData({ type:'', purpose:'' }); setFiles([]); setOpenRequest(true); };
  const handleCloseRequest = () => { setOpenRequest(false); setFiles([]); };
  const handleSubmitRequest = async () => {
    try {
      if (!formData.type || !formData.purpose) { alert('error','Please fill in all fields.'); return; }
      const fd = new FormData(); fd.append('type', formData.type); fd.append('purpose', formData.purpose);
      files.forEach((f) => fd.append('files', f));
      await api.post('documents', fd);
      alert('success','Request submitted.'); handleCloseRequest(); fetchRequests();
      setFiles([]);
    } catch (e) { alert('error', e.response?.data?.error || 'Failed to submit request'); }
  };

  // ── Resident action buttons for a given row ──────────────────────
  const ResidentActions = (req) => {
    if (req.status === 'PENDING') {
      return (
        <Button size="small" variant="outlined" onClick={() => handleCancel(req)} startIcon={<CancelIcon fontSize="inherit" />} sx={{color:'#dc2626', borderColor:'#dc2626'}}>Cancel Request</Button>
      );
    }
    return <Typography variant="body2" color="#64748b">{req.status}</Typography>;
  };

  // ── Admin action buttons for a given row ──────────────────────
  const AdminActions = (req) => {
    if (req.status === 'PENDING' || req.status === 'CANCELLED') {
      return (
        <>
          <Button size="small" variant="contained" startIcon={<SendIcon fontSize="inherit" />} onClick={() => setUploadingAdminFor(req.document_request_id)} sx={{ bgcolor:'#16a34a','&:hover':{bgcolor:'#15803d'}, mr:0.5 }}>
            Respond
          </Button>
          <Button size="small" variant="outlined" onClick={() => handleRejectOpen(req)} color="error">Reject</Button>
          <IconButton size="small" onClick={() => handleDelete(req.document_request_id)} color="error" title="Archive request" sx={{ml:0.5}}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      );
    }
    if (req.status === 'APPROVED') {
      return (
        <>
          <Button size="small" variant="outlined" onClick={() => handleStatusUpdate(req.document_request_id,'RELEASED')} sx={{ color:'#0369a1', borderColor:'#0369a1', mr:0.5 }}>Mark Released</Button>
          <IconButton size="small" onClick={() => handleDelete(req.document_request_id)} color="error" title="Archive request">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </>
      );
    }
    if (req.status === 'RELEASED' || req.status === 'REJECTED') {
      return (
        <IconButton size="small" onClick={() => handleDelete(req.document_request_id)} color="error" title="Archive request">
          <DeleteIcon fontSize="small" />
        </IconButton>
      );
    }
    return <Typography variant="body2" color="#64748b">{req.status}</Typography>;
  };

   // ── Admin Status/Comment Panel — resident cannot attach files ──
   const AdminStatusPanel = ({ requestId }) => {
     const [comment, setComment]    = useState('');
     const [status, setStatus]      = useState('APPROVED');
     const [submitting, setSubmitting] = useState(false);

     const statusOptions = [
       { value: 'PENDING',   label: 'Pending',       color: 'warning' },
       { value: 'APPROVED',  label: 'Approved',      color: 'success' },
       { value: 'REJECTED',  label: 'Rejected',      color: 'error'   },
       { value: 'RELEASED',  label: 'Released',      color: 'info'    },
       { value: 'CANCELLED', label: 'Cancelled',     color: 'default' },
     ];

     const handleCancel = useCallback(() => { setUploadingAdminFor(null); }, []);

     const handleSubmit = useCallback(async () => {
       setSubmitting(true);
       try {
         const { data } = await api.post(`documents/${requestId}/upload`, {
           status:           status,
           response_comment: comment.trim()
         });
         alert('success', 'Status updated successfully.');
         fetchRequests();
         setUploadingAdminFor(null);
       } catch (e) {
         alert('error', e.response?.data?.error || 'Failed to update status');
       } finally {
         setSubmitting(false);
       }
     }, [status, comment, requestId]);

     useEffect(() => {
       if (requestId == null) { setComment(''); setStatus('APPROVED'); }
     }, [requestId]);

     return (
       <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>

         <TextField
           fullWidth
           label="Response (optional)"
           value={comment}
           onChange={(e) => setComment(e.target.value)}
           placeholder="Add a note for the resident…"
           multiline rows={2}
           size="small"
         />

         <FormControl size="small" sx={{ minWidth: 140 }}>
           <InputLabel>Status</InputLabel>
           <Select
             value={status}
             label="Status"
             onChange={(e) => setStatus(e.target.value)}
           >
             {statusOptions.map(o => (
               <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
             ))}
           </Select>
         </FormControl>

         <Box sx={{ display: 'flex', gap: 1, pt: 0.5, alignItems: 'center' }}>
           <Button
             size="small"
             variant="contained"
             onClick={handleSubmit}
             disabled={submitting}
             startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <SendIcon fontSize="inherit" />}
             sx={{ bgcolor: '#1e293b','&:hover':{ bgcolor:'#334155' }, textTransform: 'none','&:disabled':{ bgcolor:'#cbd5e1' } }}
           >
             {submitting ? 'Saving…' : 'Submit Response'}
           </Button>
           <Button size="small" onClick={handleCancel} sx={{ textTransform: 'none', color: '#64748b' }}>Cancel</Button>
         </Box>
       </Box>
     );
   };

  const ExpandedDrawer = ({ req }) => {
    const residentFiles = (req.attachments || []).filter(a => !a.is_admin && !a.is_deleted);
    const adminFiles    = (req.attachments || []).filter(a =>  a.is_admin && !a.is_deleted);
    const isOwner       = !isAdmin && req.user_id === user?.user_id;
    return (
      <TableRow key={`${req.document_request_id}-drawer`}>
        <TableCell colSpan={5} sx={{p:0,border:'none'}}>
          <Collapse in timeout="auto" unmountOnExit>
                <Box sx={{mx:2,my:1,p:2,bgcolor:'#f8fafc',borderRadius:2,border:'1px solid #e2e8f0'}}>

                {/* ── Resident Purpose ── */}
                <Typography variant="subtitle2" fontWeight={600} color="#1e293b" sx={{mb:1}}>Resident Purpose</Typography>
                <Typography variant="body2" color="#475569" sx={{fontStyle:'italic',mb:2}}>{req.purpose}</Typography>

                {/* ── Resident Attachments ── */}
                <Typography variant="subtitle2" fontWeight={600} color="#1e293b" sx={{mb:1.5}}>Resident Attachments</Typography>
                {residentFiles.length === 0 ? (
                  <Typography variant="body2" color="#94a3b8">No files attached.</Typography>
                ) : (
                  <Box sx={{display:'flex',flexDirection:'column',gap:1}}>
                    {residentFiles.map(f => (
                      <Box key={f.document_request_attachment_id} sx={{display:'flex',alignItems:'center',justifyContent:'space-between',px:2,py:1,borderRadius:1,bgcolor:'#fff',border:'1px solid #e2e8f0'}}>
                        <Button size="small" component="a" href={fileLink(f.file_path)} target="_blank" rel="noopener noreferrer"
                          startIcon={isViewableFile(f.file_name) ? <Description fontSize="inherit" /> : <Download fontSize="inherit" />}
                          sx={{justifyContent:'flex-start',textTransform:'none',color:'#1e293b','&:hover':{bgcolor:'transparent',textDecoration:'underline'}}}>
                          {f.file_name}
                        </Button>
                        {isAdmin ? <Chip label="Resident" size="small" sx={{height:22,fontSize:'0.65rem'}} /> :
                          isOwner && <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon fontSize="inherit"/>} onClick={() => handleDeleteAttachment(req.document_request_id, f.document_request_attachment_id)} sx={{fontSize:'0.75rem'}}>Remove</Button>}
                      </Box>
                    ))}
                  </Box>
                )}

                <Divider sx={{my:2}} />

              {/* ── Admin Response ── */}
              {(req.response_file || req.response_comment) ? (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="#166534" sx={{mb:1}}>Admin Response</Typography>

                  {req.response_comment && (
                    <Typography variant="body2" color="#475569" sx={{mb:1,fontStyle:'italic',p:1.5,bgcolor:'#f0fdf4',borderRadius:1,border:'1px solid #bbf7d0'}}>
                      {req.response_comment}
                    </Typography>
                  )}

                  {adminFiles.length > 0 ? (
                    <Box sx={{display:'flex',flexDirection:'column',gap:1}}>
                      {adminFiles.map(f => (
                        <Box key={f.document_request_attachment_id} sx={{display:'flex',alignItems:'center',justifyContent:'space-between',px:2,py:1,borderRadius:1,bgcolor:'#f0fdf4',border:'1px solid #bbf7d0'}}>
                          <Button size="small" component="a" href={fileLink(f.file_path)} target="_blank" rel="noopener noreferrer" startIcon={<Description fontSize="inherit" />}
                            sx={{justifyContent:'flex-start',textTransform:'none',color:'#166534',fontWeight:600,'&:hover':{bgcolor:'transparent',textDecoration:'underline'}}}>
                            {f.file_name}
                          </Button>
                          {isAdmin ? <Chip icon={<CheckCircle />} label="Admin" size="small" sx={{bgcolor:'#dcfce7',color:'#166534',fontSize:'0.65rem'}} /> :
                            <Chip label="Admin" size="small" sx={{bgcolor:'#dcfce7',color:'#166534',fontSize:'0.65rem'}} />}
                        </Box>
                      ))}
                    </Box>
                  ) : req.response_file && (
                    <Button size="small" component="a" href={fileLink(req.response_file)} target="_blank" rel="noopener noreferrer" startIcon={<Download fontSize="inherit" />}
                      sx={{justifyContent:'flex-start',textTransform:'none',color:'#166534','&:hover':{bgcolor:'transparent',textDecoration:'underline'}}}>
                      Download response file
                    </Button>
                  )}

                  {isAdmin && uploadingAdminFor === req.document_request_id ? (
                    <Box sx={{mt:1.5}}><AdminStatusPanel requestId={req.document_request_id} /></Box>
                  ) : isAdmin && uploadingAdminFor !== req.document_request_id && (
                    <Button size="small" variant="outlined" startIcon={<SendIcon fontSize="inherit" />} onClick={() => setUploadingAdminFor(req.document_request_id)} sx={{borderColor:'#166534',color:'#166534','&:hover':{bgcolor:'#f0fdf4'},textTransform:'none',mt:1}}>Respond</Button>
                  )}
                </Box>
              ) : (
                isAdmin && uploadingAdminFor === req.document_request_id ? (
                  <Box sx={{mt:1.5}}><AdminStatusPanel requestId={req.document_request_id} /></Box>
                ) : isAdmin ? (
                  <Button size="small" variant="outlined" startIcon={<SendIcon fontSize="inherit" />} onClick={() => setUploadingAdminFor(req.document_request_id)} sx={{borderColor:'#166534',color:'#166534','&:hover':{bgcolor:'#f0fdf4'},textTransform:'none'}}>Respond</Button>
                ) : (
                  <Typography variant="body2" color="#94a3b8" sx={{fontStyle:'italic'}}>Pending admin response…</Typography>
                )
              )}

            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) return <Box sx={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'50vh'}}><CircularProgress /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
      {success && <Alert severity="success" sx={{mb:2}}>{success}</Alert>}

      <Box sx={{display:'flex',justifyContent:'space-between',alignItems:'center',mb:3}}>
        <Typography variant="h4" fontWeight={600} color="#1e293b">Document Requests</Typography>
        {!isAdmin && <Button variant="contained" startIcon={<Add />} onClick={handleOpenRequest} sx={{bgcolor:'#1e293b','&:hover':{bgcolor:'#334155'}}}>New Request</Button>}
      </Box>

      <TableContainer component={Paper} sx={{borderRadius:2,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',mb:4}}>
        <Table>
           <TableHead sx={{bgcolor:'#f8fafc'}}>
             <TableRow>
               <TableCell width="22%">Type</TableCell>
               <TableCell width="14%">Resident</TableCell>
               <TableCell width="12%">Date</TableCell>
               <TableCell width="14%">Status</TableCell>
               <TableCell width="38%" align="right">Actions</TableCell>
             </TableRow>
           </TableHead>
           <TableBody>
             {requests.map((req) => {
               const isOpen = expandedRow === req.document_request_id;
               const residentFiles = (req.attachments || []).filter(a => !a.is_admin && !a.is_deleted);
               return (
                 <React.Fragment key={req.document_request_id}>
                    <TableRow key={req.document_request_id} hover>
                      <TableCell>{req.type}</TableCell>
                      <TableCell>{req.user?.fullName || ''}</TableCell>
                      <TableCell>{new Date(req.request_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                      <Chip label={req.status} size="small" color={getStatusColor(req.status)}
                        onClick={() => setExpandedRow(isOpen ? null : req.document_request_id)}
                        onDelete={() => setExpandedRow(isOpen ? null : req.document_request_id)}
                        deleteIcon={isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        sx={{cursor:'pointer'}} />
                    </TableCell>
                    <TableCell align="right">
                      <Box component="span" sx={{display:'inline-flex',alignItems:'center',gap:1}}>
                        {isAdmin ? <AdminActions req={req} /> : <ResidentActions req={req} />}
                        <Button size="small" sx={{color:'#64748b'}} onClick={() => setExpandedRow(isOpen ? null : req.document_request_id)} title={isOpen?'Collapse':'Expand'}>
                          {isOpen ? <ExpandLess /> : <ExpandMore />}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {isOpen && <ExpandedDrawer req={req} />}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Request Dialog */}
      <Dialog open={openRequest} onClose={handleCloseRequest} maxWidth="sm" fullWidth>
        <DialogTitle>New Document Request</DialogTitle>
        <DialogContent>
          <Box sx={{display:'flex',flexDirection:'column',gap:2,mt:2}}>
            <FormControl fullWidth><InputLabel>Document Type</InputLabel>
              <Select value={formData.type} label="Document Type" onChange={(e)=>setFormData({...formData,type:e.target.value})}>
                <MenuItem value="Barangay Clearance">Barangay Clearance</MenuItem>
                <MenuItem value="Certificate of Indigency">Certificate of Indigency</MenuItem>
                <MenuItem value="Barangay Residency">Barangay Residency</MenuItem>
                <MenuItem value="Building Permit">Building Permit</MenuItem>
                <MenuItem value="Business Permit">Business Permit</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Purpose" fullWidth value={formData.purpose} onChange={(e)=>setFormData({...formData,purpose:e.target.value})} multiline rows={3} />
            <Button variant="outlined" component="label" sx={{textAlign:'left',justifyContent:'flex-start'}}>
              {files.length > 0 ? `${files.length} file(s) selected` : 'Attach File(s) (optional)'}
              <input type="file" hidden multiple accept="*/*" onChange={(e)=>setFiles(Array.from(e.target.files||[]))} />
            </Button>
            {files.length > 0 && <Box sx={{bgcolor:'#f8fafc',borderRadius:1,p:1.5}}>{files.map((f,i)=>(
              <Box key={i} sx={{display:'flex',justifyContent:'space-between',alignItems:'center',py:0.5}}>
                <Typography variant="body2" noWrap sx={{flex:1,mr:1}}>{i+1}. {f.name}</Typography>
                <IconButton size="small" onClick={()=>setFiles(files.filter((_,j)=>j!==i))}><Close fontSize="small" /></IconButton>
              </Box>
            ))}</Box>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRequest}>Cancel</Button>
          <Button onClick={handleSubmitRequest} variant="contained" sx={{bgcolor:'#1e293b'}}>Submit Request</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onClose={()=>setRejectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent><Box sx={{mt:1}}><TextField label="Reason for rejection" fullWidth multiline rows={3} value={rejectNote} onChange={(e)=>setRejectNote(e.target.value)} /></Box></DialogContent>
        <DialogActions><Button onClick={()=>setRejectOpen(false)}>Cancel</Button><Button onClick={handleRejectSubmit} variant="contained" color="error">Reject</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents;
