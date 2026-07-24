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
  ktv: 'Xem tất cả xe trong ngày, quản lý xe của mình và chi tiết công việc được giao',
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

// Xe ở các trạng thái này mới khiến thợ được coi là đang bận (đồng bộ backend workerStatus.js)
export const BUSY_CAR_STATUSES = ['working', 'waiting_wash', 'additional_repair'];

export const ADMIN_AREA_PATH = '/admin';

/**
 * adminArea: page nằm trong khu vực quản trị (/admin).
 * - Admin: vào qua portal /admin, ẩn khỏi drawer phân công.
 * - Giám sát: vẫn thấy trên drawer chính nếu có quyền (trừ mục chỉ admin).
 * path: route app chính (giám sát / bookmark).
 * adminPath: route trong portal admin.
 */
export const PERMISSION_CATALOG = [
  { key: 'cars.today', label: 'Xe trong ngày', group: 'Quản lý xe', path: '/cars', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'cars.manage', label: 'Quản lý xe', group: 'Quản lý xe', path: '/cars/manage', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'cars.add', label: 'Thêm xe', group: 'Quản lý xe', path: '/cars/add', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'cars.delete', label: 'Xóa xe', group: 'Quản lý xe', defaultRoles: ['admin'] },
  { key: 'cars.voice', label: 'Nghe thông báo thao tác (Quản lý xe)', group: 'Quản lý xe', defaultRoles: ['admin', 'giam_sat'] },
  {
    key: 'workers.main',
    label: 'Danh sách thợ',
    group: 'Thợ & công việc',
    path: '/workers/main',
    adminPath: '/admin/workers',
    adminArea: true,
    adminGroup: 'Quản lý',
    defaultRoles: ['admin', 'giam_sat'],
  },
  { key: 'workers.woker', label: 'Chi tiết công việc', group: 'Thợ & công việc', path: '/woker', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  { key: 'workers.available', label: 'Thợ rảnh', group: 'Thợ & công việc', path: '/workers/available', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'workers.repair-history', label: 'Lịch sử sửa chữa', group: 'Thợ & công việc', path: '/repair-history', defaultRoles: ['admin', 'giam_sat', 'ktv'] },
  {
    key: 'teams.manage',
    label: 'Quản lý tổ',
    group: 'Thợ & công việc',
    path: '/teams',
    adminPath: '/admin/teams',
    adminArea: true,
    adminGroup: 'Quản lý',
    defaultRoles: ['admin', 'giam_sat'],
  },
  { key: 'reports.revenue', label: 'Doanh thu thợ', group: 'Báo cáo', path: '/workers/revenue-chart', defaultRoles: ['admin', 'giam_sat'] },
  {
    key: 'reports.dashboard',
    label: 'Dashboard tổng quan',
    group: 'Báo cáo',
    path: '/dashboard',
    adminPath: '/admin/dashboard',
    adminArea: true,
    adminGroup: 'Tổng quan',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
  { key: 'reports.praise', label: 'Tuyên dương tuần', group: 'Báo cáo', path: '/workers/weekly-praise', defaultRoles: ['admin', 'giam_sat'] },
  { key: 'reports.warning', label: 'Cảnh báo tuần', group: 'Báo cáo', path: '/workers/weekly-warning', defaultRoles: ['admin', 'giam_sat'] },
  {
    key: 'system.locations',
    label: 'Địa điểm',
    group: 'Hệ thống',
    path: '/locations',
    adminPath: '/admin/locations',
    adminArea: true,
    adminGroup: 'Hệ thống',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
  {
    key: 'system.supervisors',
    label: 'Giám sát',
    group: 'Hệ thống',
    path: '/supervisors',
    adminPath: '/admin/supervisors',
    adminArea: true,
    adminGroup: 'Hệ thống',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
  {
    key: 'system.users',
    label: 'Tài khoản',
    group: 'Hệ thống',
    path: '/users',
    adminPath: '/admin/users',
    adminArea: true,
    adminGroup: 'Hệ thống',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
  {
    key: 'system.permissions',
    label: 'Phân chức năng',
    group: 'Hệ thống',
    path: '/account-permissions',
    adminPath: '/admin/account-permissions',
    adminArea: true,
    adminGroup: 'Hệ thống',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
  {
    key: 'system.audit-logs',
    label: 'Lịch sử thao tác',
    group: 'Hệ thống',
    path: '/audit-logs',
    adminPath: '/admin/audit-logs',
    adminArea: true,
    adminGroup: 'Hệ thống',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
  {
    key: 'system.ktv-messages',
    label: 'Tin nhắn KTV',
    group: 'Hệ thống',
    path: '/ktv-messages',
    adminPath: '/admin/ktv-messages',
    adminArea: true,
    adminGroup: 'Hệ thống',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
  {
    key: 'payroll.manage',
    label: 'Tính lương tháng',
    group: 'Báo cáo',
    path: '/payroll',
    adminPath: '/admin/payroll',
    adminArea: true,
    adminGroup: 'Tổng quan',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
  {
    key: 'payroll.day-work',
    label: 'Lương ngày công',
    group: 'Báo cáo',
    path: '/attendance-payroll',
    adminPath: '/admin/attendance-payroll',
    adminArea: true,
    adminGroup: 'Tổng quan',
    hideFromNav: true,
    defaultRoles: ['admin'],
  },
];

export const ADMIN_NAV_GROUP_ORDER = ['Tổng quan', 'Quản lý', 'Hệ thống'];

export const ADMIN_AREA_ITEMS = PERMISSION_CATALOG.filter((item) => item.adminArea && item.adminPath);

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((item) => item.key);

export const NAV_GROUPS = [...new Set(PERMISSION_CATALOG.map((item) => item.group))].map((title) => ({
  title,
  items: PERMISSION_CATALOG
    .filter((item) => item.group === title && item.path && !item.hideFromNav)
    .map((item) => ({
      label: item.label,
      path: item.path,
      permission: item.key,
      roles: item.defaultRoles,
      adminArea: Boolean(item.adminArea),
    })),
}));

/** Khu vực quản trị /admin — chỉ admin. ManageCars và app phân công không đổi. */
export const canAccessAdminArea = (user) => user?.role === ROLES.ADMIN;

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
  const isAdmin = canAccessAdminArea(user);

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!allowed.has(item.permission)) return false;
      // Admin dùng portal /admin — ẩn các mục adminArea khỏi drawer phân công
      if (isAdmin && item.adminArea) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  if (!isAdmin) return groups;

  const adminHome = '/admin/dashboard';
  const adminActivePaths = [
    ADMIN_AREA_PATH,
    adminHome,
    ...ADMIN_AREA_ITEMS.map((item) => item.adminPath),
    ...ADMIN_AREA_ITEMS.map((item) => item.path),
  ];

  return [
    ...groups,
    {
      title: 'Quản trị',
      items: [
        {
          label: 'Khu vực quản trị',
          path: adminHome,
          permission: 'admin.area',
          activePaths: adminActivePaths,
        },
      ],
    },
  ];
};

export const getAdminNavGroupsForUser = (user) => {
  if (!canAccessAdminArea(user)) return [];

  const allowed = new Set(getEffectivePermissions(user));
  const items = ADMIN_AREA_ITEMS.filter((item) => allowed.has(item.key)).map((item) => ({
    key: item.key,
    label: item.label,
    path: item.adminPath,
    permission: item.key,
    group: item.adminGroup || item.group,
  }));

  return ADMIN_NAV_GROUP_ORDER.map((title) => ({
    title,
    items: items.filter((item) => item.group === title),
  })).filter((group) => group.items.length > 0);
};

export const getAdminPathForPermission = (permissionKey) =>
  PERMISSION_CATALOG.find((item) => item.key === permissionKey)?.adminPath || null;

export const getFirstAllowedPath = (user) => {
  if (!user) return '/login';
  const groups = getNavGroupsForUser(user);
  const firstItem = groups[0]?.items?.[0];
  return firstItem?.path || '/cars';
};

export const getPermissionGroups = () =>
  [...new Set(PERMISSION_CATALOG.map((item) => item.group))].map((group) => ({
    group,
    items: PERMISSION_CATALOG.filter((item) => item.group === group),
  }));

export const isKtv = (roleOrUser) => {
  const role = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser;
  return role === ROLES.KTV;
};

export const canManageCars = (roleOrUser) => {
  if (typeof roleOrUser === 'object') return hasPermission(roleOrUser, 'cars.manage');
  return ['admin', 'giam_sat', 'ktv'].includes(roleOrUser);
};

export const canEditManagedCars = (user) =>
  hasPermission(user, 'cars.manage') && !isKtv(user);

export const canDeleteCars = (roleOrUser) => {
  if (typeof roleOrUser === 'object') return hasPermission(roleOrUser, 'cars.delete');
  return roleOrUser === ROLES.ADMIN;
};

export const canHearOperationVoice = (roleOrUser) => {
  if (typeof roleOrUser === 'object') return hasPermission(roleOrUser, 'cars.voice');
  return ['admin', 'giam_sat'].includes(roleOrUser);
};

export const canPollOperationLogs = (user) => {
  if (!user) return false;
  if (user.role === ROLES.ADMIN || user.role === ROLES.GIAM_SAT) return true;
  return hasPermission(user, 'system.audit-logs');
};
