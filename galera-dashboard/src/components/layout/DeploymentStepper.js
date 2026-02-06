import React from 'react';
import { Stepper, Step, StepLabel, Paper } from '@mui/material';

const steps = [
  'Infrastructure',
  'Prechecks',
  'Configuration',
  'Advanced',
  'Review & Deploy'
];

const DeploymentStepper = ({ activeStep }) => {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};

export default DeploymentStepper;
