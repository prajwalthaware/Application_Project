import React from 'react';
import { Box, Card, CardContent, Grid, Skeleton } from '@mui/material';

// Skeleton for service cards
export const ServiceCardSkeleton = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={20} />
        </Box>
      </Box>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="rectangular" width={100} height={36} sx={{ mt: 2 }} />
    </CardContent>
  </Card>
);

// Skeleton for deployment cards
export const DeploymentCardSkeleton = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Skeleton variant="text" width="50%" height={32} />
        <Skeleton variant="rounded" width={80} height={24} />
      </Box>
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Skeleton variant="text" width="100%" />
        </Grid>
        <Grid item xs={6}>
          <Skeleton variant="text" width="100%" />
        </Grid>
        <Grid item xs={6}>
          <Skeleton variant="text" width="100%" />
        </Grid>
        <Grid item xs={6}>
          <Skeleton variant="text" width="100%" />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <Skeleton variant="rectangular" width={100} height={32} />
        <Skeleton variant="rectangular" width={100} height={32} />
      </Box>
    </CardContent>
  </Card>
);

// Skeleton for template cards
export const TemplateCardSkeleton = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Skeleton variant="text" width="70%" height={28} sx={{ mb: 1.5 }} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" sx={{ mb: 2.5 }} />
      <Box sx={{ bgcolor: 'grey.100', borderRadius: 1.5, p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Grid>
          <Grid item xs={6}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        <Skeleton variant="rounded" width={70} height={24} />
        <Skeleton variant="rounded" width={100} height={24} />
      </Box>
    </CardContent>
  </Card>
);

// Skeleton for table rows
export const TableRowSkeleton = ({ columns = 5 }) => (
  <>
    {[1, 2, 3, 4, 5].map((row) => (
      <tr key={row}>
        {[...Array(columns)].map((_, col) => (
          <td key={col} style={{ padding: '16px' }}>
            <Skeleton variant="text" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// Generic page skeleton
export const PageSkeleton = () => (
  <Box sx={{ p: 4 }}>
    <Skeleton variant="text" width="30%" height={48} sx={{ mb: 1 }} />
    <Skeleton variant="text" width="50%" height={24} sx={{ mb: 4 }} />
    <Grid container spacing={3}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <Grid item xs={12} md={4} key={item}>
          <ServiceCardSkeleton />
        </Grid>
      ))}
    </Grid>
  </Box>
);
