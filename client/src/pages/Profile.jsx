import { useState, useEffect } from 'react';
import { Typography, Box, Paper, CircularProgress, Grid } from '@mui/material';
import {
  Person, Email, Badge, Home, CalendarToday,
  Phone, Work, Favorite, Transgender
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isOfficialOrResident = ['OFFICIAL', 'RESIDENT'].includes(role);

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: r } = await api.get('auth/me');
        const u = r.user;
        const result = {};

        // ── Account information (available to all roles) ──────
        result.fullName = user?.fullName || '';
        result.username  = user?.username || '';
        result.email     = user?.email || '';
        result.role      = user?.role || '';

        // ── Resident information (OFFICIAL & RESIDENT only) ─────
        if (isOfficialOrResident && r.user?.resident) {
          result.full_name    = r.user.resident.full_name || '';
          result.gender       = r.user.resident.gender || '';
          result.birthday     = r.user.resident.birthday || '';
          result.age          = r.user.resident.age ?? '';
          result.address      = r.user.resident.address || '';
          result.contact      = r.user.resident.contact || '';
          result.occupation   = r.user.resident.occupation || '';
          result.civil_status = r.user.resident.civil_status || '';

          if (role === 'OFFICIAL') {
            result.position    = r.official?.position || '';
            result.term_start  = r.official?.term_start || '';
            result.term_end    = r.official?.term_end || '';
          }
        }

        setData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (val) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d) ? val : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // ── Shared info row ──────────────────────────────────────
  const InfoRow = ({ icon: Icon, label, value }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 0.75 }}>
      <Box sx={{ color: '#64748b', pt: 0.5, display: 'flex' }}>
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="#94a3b8" sx={{ fontWeight: 500, letterSpacing: '.1px', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="#1e293b" sx={{ fontWeight: 500 }}>
          {value || '—'}
        </Typography>
      </Box>
    </Box>
  );

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3.5 }}>
      <Typography variant="h4" fontWeight={700} color="#0f172a" mb={4} sx={{ letterSpacing: '-.3px' }}>
        My Profile
      </Typography>

      {/* ══════════════════════════════════════════
          ADMIN — Account Information only
      ══════════════════════════════════════════ */}
      {role === 'ADMIN' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3.5, borderRadius: 3, boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
              <Typography variant="h6" fontWeight={700} color="#0f172a" mb={3.5} sx={{ letterSpacing: '-.1px' }}>
                Account Information
              </Typography>
              <Grid container spacing={3}>
                {[
                  { icon: Person,  label: 'Full Name', value: data.fullName },
                  { icon: Badge,   label: 'Username',  value: data.username },
                  { icon: Email,   label: 'Email',     value: data.email },
                  { icon: Badge,   label: 'Role',      value: data.role },
                ].map(({ icon: Icon, label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <InfoRow icon={Icon} label={label} value={value} />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ══════════════════════════════════════════
          OFFICIAL & RESIDENT — split view
      ══════════════════════════════════════════ */}
      {isOfficialOrResident && (
        <Grid container spacing={3}>
          {/* ── Left: Resident / Role Information ── */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3.5, borderRadius: 3, boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
              <Typography variant="h6" fontWeight={700} color="#0f172a" mb={3.5} sx={{ letterSpacing: '-.1px' }}>
                {role === 'OFFICIAL' ? 'Role Information' : 'Resident Information'}
              </Typography>

              <Grid container spacing={3}>
                {[
                  { icon: Person,       label: 'Full Name',    value: data.full_name || data.fullName },
                  { icon: Home,         label: 'Address',      value: data.address },
                  { icon: CalendarToday,label: 'Birthday',     value: formatDate(data.birthday) },
                  { icon: Badge,        label: 'Age',          value: data.age },
                  { icon: Transgender,  label: 'Gender',       value: data.gender },
                  { icon: Phone,        label: 'Contact',      value: data.contact },
                  { icon: Work,         label: 'Occupation',   value: data.occupation },
                  { icon: Favorite,     label: 'Civil Status', value: data.civil_status },
                  ...(role === 'OFFICIAL'
                    ? [
                        { icon: Badge, label: 'Position',     value: data.position },
                        { icon: Badge, label: 'Term Start',   value: formatDate(data.term_start) },
                        { icon: Badge, label: 'Term End',     value: formatDate(data.term_end) },
                      ]
                    : []),
                ].map(({ icon: Icon, label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <InfoRow icon={Icon} label={label} value={value} />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* ── Right: Account Information ── */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3.5, borderRadius: 3, boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
              <Typography variant="h6" fontWeight={700} color="#0f172a" mb={3.5} sx={{ letterSpacing: '-.1px' }}>
                Account Information
              </Typography>
              <Grid container spacing={3}>
                {[
                  { icon: Person, label: 'Full Name', value: data.fullName },
                  { icon: Badge,  label: 'Username',  value: data.username },
                  { icon: Email,  label: 'Email',     value: data.email },
                  { icon: Badge,  label: 'Role',      value: data.role },
                ].map(({ icon: Icon, label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <InfoRow icon={Icon} label={label} value={value} />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Profile;
