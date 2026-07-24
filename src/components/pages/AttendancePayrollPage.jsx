import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import FilterPanel from '../common/FilterPanel';
import AttendanceCalendarTab from '../AttendancePayroll/AttendanceCalendarTab';
import AttendanceDayDialog from '../AttendancePayroll/AttendanceDayDialog';
import AttendanceSettingsDialog from '../AttendancePayroll/AttendanceSettingsDialog';
import DayWorkPayrollTab from '../AttendancePayroll/DayWorkPayrollTab';
import { MONTHS, YEARS, now } from '../AttendancePayroll/constants';
import {
  getAllTeams,
  getAttendanceCalendar,
  getAttendanceWorkers,
  getAttendanceSettings,
  updateAttendanceSettings,
  upsertAttendanceDays,
  getDayWorkPayroll,
  syncDayWorkPayroll,
  saveDayWorkPayroll,
} from '../apis/index';
import { exportDayWorkPayrollToExcel } from '../../utils/dayWorkPayrollExcel';
import { parseDayListInput } from '../../utils/attendanceUi';

const AttendancePayrollPage = () => {
  const [tab, setTab] = useState('calendar');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workerId, setWorkerId] = useState('');

  const [calendarData, setCalendarData] = useState(null);
  const [calLoading, setCalLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [selectedDates, setSelectedDates] = useState([]);
  const [multiMode, setMultiMode] = useState(false);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [quickDays, setQuickDays] = useState('');
  const [applyStatus, setApplyStatus] = useState('unpaid_full');

  const [dayDialog, setDayDialog] = useState(null);
  const [dayForm, setDayForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});
  const [holidayInput, setHolidayInput] = useState({ date: '', name: '' });

  const [payrollRows, setPayrollRows] = useState([]);
  const [payrollTotals, setPayrollTotals] = useState({});
  const [payrollStatus, setPayrollStatus] = useState('draft');
  const [payrollMeta, setPayrollMeta] = useState({});
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const loadTeamsAndWorkers = useCallback(async () => {
    try {
      const [teamsRes, workersRes] = await Promise.all([
        getAllTeams(),
        getAttendanceWorkers(teamId ? { teamId } : undefined),
      ]);
      const teamList = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data?.data || []);
      setTeams(teamList);
      const list = workersRes.data?.data || [];
      setWorkers(list);
      setWorkerId((prev) => {
        if (prev && list.some((w) => String(w._id) === String(prev))) return prev;
        return list[0]?._id || '';
      });
    } catch {
      setMessage({ type: 'error', text: 'Không tải được danh sách thợ' });
    }
  }, [teamId]);

  const loadCalendar = useCallback(async () => {
    if (!workerId) return;
    setCalLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await getAttendanceCalendar(workerId, year, month);
      setCalendarData(res.data);
      setSelectedDates([]);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không tải lịch chấm công',
      });
      setCalendarData(null);
    } finally {
      setCalLoading(false);
    }
  }, [workerId, year, month]);

  const loadPayroll = useCallback(async () => {
    setPayrollLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await getDayWorkPayroll(year, month);
      setPayrollRows(res.data?.data?.rows || []);
      setPayrollTotals(res.data?.data?.totals || {});
      setPayrollStatus(res.data?.data?.status || 'draft');
      setPayrollMeta({
        ngayCongChuan: res.data?.data?.ngayCongChuan,
        hoursPerDay: res.data?.data?.hoursPerDay,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không tải bảng lương ngày công',
      });
      setPayrollRows([]);
    } finally {
      setPayrollLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadTeamsAndWorkers();
  }, [loadTeamsAndWorkers]);

  useEffect(() => {
    if (tab === 'calendar') loadCalendar();
  }, [tab, loadCalendar]);

  useEffect(() => {
    if (tab === 'payroll') loadPayroll();
  }, [tab, loadPayroll]);

  const calendarCells = useMemo(() => {
    if (!calendarData?.days?.length) return [];
    const first = calendarData.days[0];
    const jsDay = new Date(`${first.date}T12:00:00`).getDay();
    const mondayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const blanks = Array.from({ length: mondayIndex }, () => null);
    return [...blanks, ...calendarData.days];
  }, [calendarData]);

  const openDayDialog = (dateOrDay) => {
    const day = typeof dateOrDay === 'string'
      ? calendarData?.days?.find((d) => d.date === dateOrDay)
      : dateOrDay;
    if (!day || day.isSunday) return;
    setDayForm({
      status: day.status || 'present',
      lateMinutes: day.lateMinutes || 0,
      earlyLeaveMinutes: day.earlyLeaveMinutes || 0,
      leaveMinutes: day.leaveMinutes || 0,
      standardCheckIn: day.standardCheckIn || calendarData?.settings?.standardCheckIn || '08:00',
      standardCheckOut: day.standardCheckOut || calendarData?.settings?.standardCheckOut || '17:00',
      actualCheckIn: day.actualCheckIn || '',
      actualCheckOut: day.actualCheckOut || '',
      note: day.note || '',
    });
    setDayDialog(day);
  };

  const toggleSelectDate = (date, isSunday) => {
    if (isSunday) return;
    if (!multiMode) {
      openDayDialog(date);
      return;
    }
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const applyPayload = async (payload) => {
    if (!workerId) return;
    setSaving(true);
    try {
      await upsertAttendanceDays(workerId, year, month, payload);
      setMessage({ type: 'success', text: 'Đã lưu chấm công' });
      setDayDialog(null);
      setSelectedDates([]);
      await loadCalendar();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lưu chấm công thất bại',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDayDialog = () => {
    if (!dayDialog) return;
    const { deductSalary: _ignored, ...payload } = dayForm;
    applyPayload({
      date: dayDialog.date,
      ...payload,
      status: dayForm.status || 'present',
    });
  };

  const selectStatus = (status) => {
    setDayForm((prev) => {
      const next = { ...prev, status };
      if (['unpaid_full', 'paid_full', 'annual_leave', 'sick_paid', 'sick_unpaid', 'compensatory', 'present', 'holiday', 'business_trip'].includes(status)) {
        next.lateMinutes = 0;
        next.earlyLeaveMinutes = 0;
        next.leaveMinutes = 0;
        next.actualCheckIn = '';
        next.actualCheckOut = '';
      }
      if (status === 'morning_off' || status === 'afternoon_off') {
        next.lateMinutes = 0;
        next.earlyLeaveMinutes = 0;
        next.leaveMinutes = 0;
      }
      return next;
    });
  };

  const handleApplySelected = () => {
    const dates = [...selectedDates];
    if (rangeFrom && rangeTo) {
      applyPayload({ fromDate: rangeFrom, toDate: rangeTo, status: applyStatus });
      return;
    }
    const listDays = parseDayListInput(quickDays);
    if (listDays.length) {
      applyPayload({ dates: listDays, status: applyStatus });
      setQuickDays('');
      return;
    }
    if (!dates.length) {
      setMessage({ type: 'warning', text: 'Chọn ngày hoặc nhập danh sách ngày' });
      return;
    }
    applyPayload({ dates, status: applyStatus });
  };

  const openSettings = async () => {
    try {
      const res = await getAttendanceSettings();
      setSettingsForm(res.data?.data || {});
      setSettingsOpen(true);
    } catch {
      setMessage({ type: 'error', text: 'Không tải cấu hình' });
    }
  };

  const saveSettings = async () => {
    try {
      await updateAttendanceSettings(settingsForm);
      setSettingsOpen(false);
      setMessage({ type: 'success', text: 'Đã lưu cấu hình chấm công' });
      if (tab === 'calendar') loadCalendar();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lưu thất bại' });
    }
  };

  const handleSyncPayroll = async () => {
    setSaving(true);
    try {
      const res = await syncDayWorkPayroll(year, month);
      setPayrollRows(res.data?.data?.rows || []);
      setPayrollTotals(res.data?.data?.totals || {});
      setPayrollStatus(res.data?.data?.status || 'draft');
      setMessage({ type: 'success', text: 'Đã đồng bộ từ chấm công' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Đồng bộ thất bại' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayroll = async () => {
    setSaving(true);
    try {
      const res = await saveDayWorkPayroll(year, month, {
        status: 'saved',
        rows: payrollRows,
      });
      setPayrollRows(res.data?.data?.rows || []);
      setPayrollTotals(res.data?.data?.totals || {});
      setPayrollStatus(res.data?.data?.status || 'saved');
      setMessage({ type: 'success', text: 'Đã lưu bảng lương ngày công' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lưu thất bại' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportDayWorkPayrollToExcel({
        year,
        month,
        rows: payrollRows,
        totals: payrollTotals,
      });
      setMessage({ type: 'success', text: 'Đã xuất Excel' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Xuất Excel thất bại' });
    }
  };

  const updatePayrollRow = (index, patch) => {
    setPayrollRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const worker = calendarData?.worker;
  const summary = calendarData?.summary;
  const rates = calendarData?.rates;

  return (
    <PageLayout>
      <PageHeader
        icon={<EventAvailableIcon />}
        title="Lương ngày công"
        subtitle="Chấm công theo lịch tháng + bảng lương ngày công (không tính theo doanh thu)"
        actions={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={<SettingsIcon />} onClick={openSettings}>
              Cấu hình
            </Button>
            {tab === 'payroll' && (
              <>
                <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={handleSyncPayroll} disabled={saving}>
                  Đồng bộ chấm công
                </Button>
                <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport} disabled={!payrollRows.length}>
                  Xuất Excel
                </Button>
                <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSavePayroll} disabled={saving}>
                  Lưu bảng
                </Button>
              </>
            )}
            {tab === 'calendar' && (
              <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadCalendar} disabled={calLoading}>
                Tải lại
              </Button>
            )}
          </Stack>
        )}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
      >
        <Tab value="calendar" label="Chấm công" />
        <Tab value="payroll" label="Bảng lương ngày công" />
      </Tabs>

      <FilterPanel title={tab === 'calendar' ? 'Thợ & kỳ chấm công' : 'Kỳ lương'}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Tháng</InputLabel>
            <Select label="Tháng" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m) => <MenuItem key={m} value={m}>Tháng {m}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Năm</InputLabel>
            <Select label="Năm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          {tab === 'calendar' && (
            <>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Bộ phận</InputLabel>
                <Select
                  label="Bộ phận"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {teams.map((t) => (
                    <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Thợ</InputLabel>
                <Select
                  label="Thợ"
                  value={workerId ? String(workerId) : ''}
                  onChange={(e) => setWorkerId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Chọn thợ</em>
                  </MenuItem>
                  {workers.map((w) => (
                    <MenuItem key={String(w._id)} value={String(w._id)}>
                      {w.name} {w.soBaoDanh ? `(${w.soBaoDanh})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
          {tab === 'payroll' && (
            <Chip size="small" label={payrollStatus === 'saved' ? 'Đã lưu' : 'Nháp'} color={payrollStatus === 'saved' ? 'success' : 'default'} />
          )}
        </Stack>
      </FilterPanel>

      {message.text && (
        <Alert severity={message.type || 'info'} sx={{ mb: 1.5 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {tab === 'calendar' && (
        <AttendanceCalendarTab
          calLoading={calLoading}
          calendarData={calendarData}
          calendarCells={calendarCells}
          worker={worker}
          rates={rates}
          summary={summary}
          multiMode={multiMode}
          setMultiMode={setMultiMode}
          applyStatus={applyStatus}
          setApplyStatus={setApplyStatus}
          rangeFrom={rangeFrom}
          setRangeFrom={setRangeFrom}
          rangeTo={rangeTo}
          setRangeTo={setRangeTo}
          quickDays={quickDays}
          setQuickDays={setQuickDays}
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          saving={saving}
          onApplySelected={handleApplySelected}
          onToggleSelectDate={toggleSelectDate}
        />
      )}

      {tab === 'payroll' && (
        <DayWorkPayrollTab
          payrollLoading={payrollLoading}
          payrollRows={payrollRows}
          payrollTotals={payrollTotals}
          payrollMeta={payrollMeta}
          selectedRow={selectedRow}
          setSelectedRow={setSelectedRow}
          updatePayrollRow={updatePayrollRow}
        />
      )}

      <AttendanceDayDialog
        dayDialog={dayDialog}
        dayForm={dayForm}
        setDayForm={setDayForm}
        saving={saving}
        onClose={() => setDayDialog(null)}
        onSave={handleSaveDayDialog}
        onSelectStatus={selectStatus}
      />

      <AttendanceSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        holidayInput={holidayInput}
        setHolidayInput={setHolidayInput}
        onSave={saveSettings}
      />
    </PageLayout>
  );
};

export default AttendancePayrollPage;
