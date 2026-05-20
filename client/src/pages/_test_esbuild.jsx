import { TableRow, TableCell } from '@mui/material';
import { useState } from 'react';

export default function Test() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow><TableCell>A</TableCell></TableRow>
      {open ? (
        <TableRow><TableCell>B</TableCell></TableRow>
      ) : null}
    </>
  );
}
