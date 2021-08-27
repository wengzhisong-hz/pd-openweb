export default {
  // 工作流
  workflow: {
    path: '/app/:appId/workflow',
    component: () => import('pages/workflow/WorkflowList/AppWorkflowList'),
    sensitive: true,
  },

  // 权限
  role: {
    path: '/app/:appId/role',
    component: () => import('pages/Roles'),
    sensitive: true,
  },

  // 应用管理
  appPkg: {
    path: '/app/:appId/:groupId?/:worksheetId?/:viewId?',
    component: () => import('src/pages/worksheet/WorkSheet'),
    sensitive: true,
  },
};
