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

export const PERMISSION_CATALOG = [
  { key: 'cars.today', label: 'Xe trong ngày', group: 'Quản lý xe', path: '/cars', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'cars.manage', label: 'Quản lý xe', group: 'Quản lý xe', path: '/cars/manage', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'cars.add', label: 'Thêm xe', group: 'Quản lý xe', path: '/cars/add', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'cars.delete', label: 'Xóa xe', group: 'Quản lý xe', defaultRoles: ['admin'] },
  { key: 'cars.voice', label: 'Nghe thông báo thao tác (Quản lý xe)', group: 'Quản lý xe', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'workers.main', label: 'Danh sách thợ', group: 'Thợ & công việc', path: '/workers/main', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'workers.available', label: 'Thợ rảnh', group: 'Thợ & công việc', path: '/workers/available', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'workers.woker', label: 'Chi tiết công việc', group: 'Thợ & công việc', path: '/woker', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'workers.repair-history', label: 'Lịch sử sửa chữa', group: 'Thợ & công việc', path: '/repair-history', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'workers.kpi', label: 'KPI thợ', group: 'Thợ & công việc', path: '/workers/kpi', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'teams.manage', label: 'Quản lý tổ', group: 'Thợ & công việc', path: '/teams', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'reports.revenue', label: 'Doanh thu thợ', group: 'Báo cáo', path: '/workers/revenue-chart', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'reports.praise', label: 'Tuyên dương tuần', group: 'Báo cáo', path: '/workers/weekly-praise', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'reports.warning', label: 'Cảnh báo tuần', group: 'Báo cáo', path: '/workers/weekly-warning', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'system.locations', label: 'Địa điểm', group: 'Hệ thống', path: '/locations', defaultRoles: ['admin'] },
  { key: 'system.supervisors', label: 'Giám sát', group: 'Hệ thống', path: '/supervisors', defaultRoles: ['admin'] },
  { key: 'system.users', label: 'Tài khoản', group: 'Hệ thống', path: '/users', defaultRoles: ['admin'] },
  { key: 'system.permissions', label: 'Phân chức năng', group: 'Hệ thống', path: '/account-permissions', defaultRoles: ['admin'] },
  { key: 'system.audit-logs', label: 'Lịch sử thao tác', group: 'Hệ thống', path: '/audit-logs', defaultRoles: ['admin'] },
];

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((item) => item.key);

export const NAV_GROUPS = [...new Set(PERMISSION_CATALOG.map((item) => item.group))].map((title) => ({
  title,
  items: PERMISSION_CATALOG
    .filter((item) => item.group === title && item.path)
    .map((item) => ({
      label: item.label,
      path: item.path,
      permission: item.key,
      roles: item.defaultRoles,
    })),
}));

export const getDefaultPermissionsForRole = (role) =>
  PERMISSION_CATALOG.filter((item) => item.defaultRoles.includes(role)).map((item) => item.key);

export const usesCustomPermissions = (user) => Array.isArray(user?.permissions) && user.permissions.length > 0;

export const getEffectivePermissions = (user) => {
  if (!user) return [];
  if (user.role === ROLES.ADMIN) return PERMISSION_KEYS;
  if (usesCustomPermissions(user)) return user.permissions;
  return getDefaultPermissionsForRole(user.role);
};

export const hasPermission = (user, permissionKey) => {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  return getEffectivePermissions(user).includes(permissionKey);
};

export const getNavGroupsForUser = (user) => {
  const allowed = new Set(getEffectivePermissions(user));

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowed.has(item.permission)),
  })).filter((group) => group.items.length > 0);
};

export const getNavGroupsForRole = (role) =>
  getNavGroupsForUser({ role, permissions: [] });

export const getPermissionByPath = (path) =>
  PERMISSION_CATALOG.find((item) => item.path === path);

export const canAccessRoute = (path, userOrRole) => {
  const user = typeof userOrRole === 'string'
    ? { role: userOrRole, permissions: [] }
    : userOrRole;

  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;

  const permission = getPermissionByPath(path);
  if (!permission) return true;
  return hasPermission(user, permission.key);
};

export const getPermissionGroups = () =>
  [...new Set(PERMISSION_CATALOG.map((item) => item.group))].map((group) => ({
    group,
    items: PERMISSION_CATALOG.filter((item) => item.group === group),
  }));

export const isAdmin = (role) => role === ROLES.ADMIN;
export const isGiamSat = (role) => role === ROLES.GIAM_SAT;
export const isKtv = (role) => role === ROLES.KTV;

const resolveRole = (roleOrUser) =>
  typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser;

export const canManageCars = (roleOrUser) => {
  if (typeof roleOrUser === 'object') return hasPermission(roleOrUser, 'cars.manage');
  return ['admin', 'giam_sat'].includes(roleOrUser);
};

export const canDeleteCars = (roleOrUser) => {
  if (typeof roleOrUser === 'object') return hasPermission(roleOrUser, 'cars.delete');
  return resolveRole(roleOrUser) === ROLES.ADMIN;
};

export const canHearOperationVoice = (roleOrUser) => {
  if (typeof roleOrUser === 'object') return hasPermission(roleOrUser, 'cars.voice');
  return ['admin', 'giam_sat'].includes(roleOrUser);
};
