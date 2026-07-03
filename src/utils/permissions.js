export const ROLES = {
  ADMIN: 'admin',
  GIAM_SAT: 'giam_sat',
  KTV: 'ktv',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  giam_sat: 'Giám sát',
  ktv: 'KTV',
};

export const ROLE_DESCRIPTIONS = {
  admin: 'Toàn quyền: quản lý xe, thợ, báo cáo, địa điểm, giám sát và tài khoản',
  giam_sat: 'Quản lý xe, phân công thợ, xem báo cáo — không xóa xe hay quản lý hệ thống',
  ktv: 'Xem đầy đủ xe, quản lý xe, lịch sử sửa chữa và công việc được giao',
};

export const CAR_STATUS_LABELS = {
  pending: 'Chờ sửa',
  working: 'Đang sửa',
  done: 'Sửa xong',
  waiting_wash: 'Chờ rửa',
  waiting_handover: 'Chờ giao',
  additional_repair: 'Sửa bổ sung',
  delivered: 'Đã giao',
};

export const ACTIVE_CAR_STATUSES = [
  'pending',
  'working',
  'done',
  'waiting_wash',
  'waiting_handover',
  'additional_repair',
];

export const NAV_GROUPS = [
  {
    title: 'Quản lý xe',
    items: [
      { label: 'Xe trong ngày', path: '/cars', roles: ['admin', 'giam_sat', 'ktv'] },
      { label: 'Quản lý xe', path: '/cars/manage', roles: ['admin', 'giam_sat', 'ktv'] },
      { label: 'Thêm xe', path: '/cars/add', roles: ['admin', 'giam_sat'] },
    ],
  },
  {
    title: 'Thợ & công việc',
    items: [
      { label: 'Danh sách thợ', path: '/workers/main', roles: ['admin', 'giam_sat'] },
      { label: 'Thợ rảnh', path: '/workers/available', roles: ['admin', 'giam_sat', 'ktv'] },
      { label: 'Chi tiết công việc', path: '/woker', roles: ['admin', 'giam_sat', 'ktv'] },
      { label: 'Lịch sử sửa chữa', path: '/repair-history', roles: ['admin', 'giam_sat', 'ktv'] },
      { label: 'KPI thợ', path: '/workers/kpi', roles: ['admin', 'giam_sat', 'ktv'] },
      { label: 'Quản lý tổ', path: '/teams', roles: ['admin', 'giam_sat'] },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      { label: 'Doanh thu thợ', path: '/workers/revenue-chart', roles: ['admin', 'giam_sat'] },
      { label: 'Tuyên dương tuần', path: '/workers/weekly-praise', roles: ['admin', 'giam_sat'] },
      { label: 'Cảnh báo tuần', path: '/workers/weekly-warning', roles: ['admin', 'giam_sat'] },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { label: 'Địa điểm', path: '/locations', roles: ['admin'] },
      { label: 'Giám sát', path: '/supervisors', roles: ['admin'] },
      { label: 'Tài khoản', path: '/users', roles: ['admin'] },
      { label: 'Lịch sử thao tác', path: '/audit-logs', roles: ['admin'] },
    ],
  },
];

export const getNavGroupsForRole = (role) =>
  NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

export const canAccessRoute = (path, role) => {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((nav) => nav.path === path);
    if (item) return item.roles.includes(role);
  }
  return true;
};

export const isAdmin = (role) => role === ROLES.ADMIN;
export const isGiamSat = (role) => role === ROLES.GIAM_SAT;
export const isKtv = (role) => role === ROLES.KTV;

export const canManageCars = (role) => ['admin', 'giam_sat'].includes(role);
export const canDeleteCars = (role) => role === ROLES.ADMIN;
