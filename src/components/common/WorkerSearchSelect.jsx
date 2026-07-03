import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { filterWorkersByKeyword, getWorkerLabel } from '../../utils/workerSearch';

const WorkerSearchSelect = ({
  workers = [],
  value = '',
  onChange,
  label = 'Tìm thợ',
  placeholder = 'Nhập tên, SBD...',
  allowEmpty = true,
  emptyLabel = 'Tất cả thợ',
  fullWidth = true,
  size = 'small',
  sx,
  disabled = false,
}) => {
  const options = allowEmpty
    ? [{ _id: '', name: emptyLabel, soBaoDanh: '' }, ...workers]
    : workers;

  const selected =
    options.find((worker) => String(worker._id) === String(value)) ||
    (allowEmpty && !value ? options[0] : null);

  return (
    <Autocomplete
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      sx={sx}
      options={options}
      value={selected}
      onChange={(_, option) => onChange(option?._id || '')}
      getOptionLabel={(option) =>
        option?._id === '' ? emptyLabel : getWorkerLabel(option)
      }
      isOptionEqualToValue={(option, current) =>
        String(option?._id) === String(current?._id)
      }
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={placeholder} />
      )}
      filterOptions={(opts, { inputValue }) => {
        const emptyOption = allowEmpty ? opts.find((option) => option._id === '') : null;
        const workerOptions = allowEmpty ? opts.filter((option) => option._id !== '') : opts;
        const filtered = filterWorkersByKeyword(workerOptions, inputValue);
        return emptyOption ? [emptyOption, ...filtered] : filtered;
      }}
    />
  );
};

export default WorkerSearchSelect;
