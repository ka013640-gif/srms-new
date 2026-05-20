import { useState, useEffect } from 'react';
import { Typography, Box, Paper, CircularProgress, Grid } from '@mui/material';
import { People, Timeline, PieChart as PieIcon, Male, Female } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../services/api';

const AGE_COLORS = { children: '#3b82f6', adults: '#16a34a', seniors: '#f97316' };
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#94a3b8'];

const Demographics = () => {
  const [ageData, setAgeData] = useState({ children: 0, adults: 0, seniors: 0 });
  const [genderData, setGenderData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemographics();
  }, []);

  const fetchDemographics = async () => {
    try {
      const [ageRes, genderRes] = await Promise.all([
        api.get('activity/demographics'),
        api.get('activity/gender-demographics')
      ]);
      setAgeData(ageRes.data);
      setGenderData(genderRes.data);
    } catch (error) {
      console.error('Failed to fetch demographics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const total = ageData.children + ageData.adults + ageData.seniors;
  const childrenPct = total ? ((ageData.children / total) * 100).toFixed(1) : '0';
  const adultsPct   = total ? ((ageData.adults   / total) * 100).toFixed(1) : '0';
  const seniorsPct  = total ? ((ageData.seniors  / total) * 100).toFixed(1) : '0';

  const ageChartData = [
    { name: 'Children (0-17)', value: ageData.children, pct: childrenPct, color: AGE_COLORS.children },
    { name: 'Adults (18-59)', value: ageData.adults,   pct: adultsPct,   color: AGE_COLORS.adults   },
    { name: 'Seniors (60+)',  value: ageData.seniors,  pct: seniorsPct,  color: AGE_COLORS.seniors  },
  ];
  const ageBarMax  = Math.max(...ageChartData.map(d => d.value), 1);

  const genderEntries = Object.entries(genderData);
  const genderChartData = genderEntries.map(([label, count], i) => ({
    name: label,
    value: count,
    pct:  genderEntries.reduce((s, [, v]) => s + v, 0)
          ? ((count / genderEntries.reduce((s, [, v]) => s + v, 0)) * 100).toFixed(1)
          : '0',
    color: GENDER_COLORS[i % GENDER_COLORS.length],
  }));
  const genderBarMax = Math.max(...genderChartData.map(d => d.value), 1);

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} color="#1e293b" mb={3}>
        Demographics
      </Typography>

      {/* ── Age Distribution ── */}
      <Typography variant="h6" fontWeight={600} color="#1e293b" mb={2}>
        Age Distribution
      </Typography>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center', bgcolor: '#eff6ff' }}>
            <People sx={{ fontSize: 40, color: '#3b82f6', mb: 1 }} />
            <Typography variant="h3" fontWeight={700}>{ageData.children}</Typography>
            <Typography variant="body2" color="#64748b">Children (0-17)</Typography>
            <Typography variant="body1" color="#3b82f6" fontWeight={600}>{childrenPct}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center', bgcolor: '#f0fdf4' }}>
            <Timeline sx={{ fontSize: 40, color: '#16a34a', mb: 1 }} />
            <Typography variant="h3" fontWeight={700}>{ageData.adults}</Typography>
            <Typography variant="body2" color="#64748b">Adults (18-59)</Typography>
            <Typography variant="body1" color="#16a34a" fontWeight={600}>{adultsPct}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center', bgcolor: '#fff7ed' }}>
            <PieIcon sx={{ fontSize: 40, color: '#f97316', mb: 1 }} />
            <Typography variant="h3" fontWeight={700}>{ageData.seniors}</Typography>
            <Typography variant="body2" color="#64748b">Seniors (60+)</Typography>
            <Typography variant="body1" color="#f97316" fontWeight={600}>{seniorsPct}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center', bgcolor: '#fafafa' }}>
            <PieIcon sx={{ fontSize: 40, color: '#64748b', mb: 1 }} />
            <Typography variant="h3" fontWeight={700}>{total}</Typography>
            <Typography variant="body2" color="#64748b">Total Active Residents</Typography>
            <Typography variant="body1" color="#64748b" fontWeight={600}>100%</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Age Charts */}
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Age Bar Graph</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ageChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
                <Tooltip formatter={(value) => [value, 'Residents']} />
                <Bar dataKey="value" name="Residents">
                  {ageChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Age Pie Graph</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ageChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, pct }) => `${name.slice(0, 10)}… ${pct}%`}
                >
                  {ageChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} residents`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Gender Distribution ── */}
      <Typography variant="h6" fontWeight={600} color="#1e293b" mb={2}>
        Gender Distribution
      </Typography>

      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center', bgcolor: '#eff6ff' }}>
            <Male sx={{ fontSize: 40, color: '#3b82f6', mb: 1 }} />
            <Typography variant="h3" fontWeight={700}>{genderData.Male || 0}</Typography>
            <Typography variant="body2" color="#64748b">Male</Typography>
            <Typography variant="body1" color="#3b82f6" fontWeight={600}>
              {genderEntries.length
                ? ((genderData.Male || 0) / genderEntries.reduce((s, [, v]) => s + v, 0) * 100).toFixed(1)
                : '0'}%
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center', bgcolor: '#fce7f3' }}>
            <Female sx={{ fontSize: 40, color: '#ec4899', mb: 1 }} />
            <Typography variant="h3" fontWeight={700}>{genderData.Female || 0}</Typography>
            <Typography variant="body2" color="#64748b">Female</Typography>
            <Typography variant="body1" color="#ec4899" fontWeight={600}>
              {genderEntries.length
                ? ((genderData.Female || 0) / genderEntries.reduce((s, [, v]) => s + v, 0) * 100).toFixed(1)
                : '0'}%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Gender Bar Graph</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={genderChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
                <Tooltip formatter={(value) => [value, 'Residents']} />
                <Bar dataKey="value" name="Residents">
                  {genderChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Gender Pie Graph</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={genderChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, pct }) => `${name} ${pct}%`}
                >
                  {genderChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} residents`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Demographics;
