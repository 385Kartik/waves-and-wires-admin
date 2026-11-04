export interface PermissionItem {
  id: string;
  label: string;
  group: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  title: string;
  icon?: string;
  permissions: PermissionItem[];
}

export const ALL_PERMISSIONS: PermissionItem[] = [
  // ── Dashboard ──
  { id: 'dashboard:view', label: 'View Dashboard & KPIs', group: 'Dashboard', description: 'Access main dashboard overview, revenue metrics, and analytics charts' },

  // ── Orders ──
  { id: 'orders:view', label: 'View Orders', group: 'Orders', description: 'View customer orders list, order details, addresses, and payment information' },
  { id: 'orders:edit', label: 'Manage & Update Orders', group: 'Orders', description: 'Update order statuses, sync with Shiprocket courier, and verify PhonePe payments' },

  // ── CRM & Leads ──
  { id: 'crm:view', label: 'View CRM & Leads', group: 'CRM & Leads', description: 'View leads captured from WhatsApp, Cart additions, and signups' },
  { id: 'crm:edit', label: 'Update Leads & Notes', group: 'CRM & Leads', description: 'Update lead status (New Lead, In Cart, Closed Won, etc.), edit customer notes and details' },
  { id: 'crm:assign', label: 'Assign & Reassign Leads', group: 'CRM & Leads', description: 'Manually assign or reassign leads to specific sales executives or managers' },
  { id: 'crm:round_robin', label: 'Manage Round Robin Settings', group: 'CRM & Leads', description: 'Configure automated round-robin lead distribution rules and reshuffle leads' },

  // ── Products & Catalog ──
  { id: 'products:view', label: 'View Products', group: 'Products', description: 'Browse product catalog, pricing, and active status' },
  { id: 'products:edit', label: 'Create & Edit Products', group: 'Products', description: 'Add new products, change prices, update descriptions, specifications, and images' },
  { id: 'categories:view', label: 'View Categories', group: 'Products', description: 'Browse product categories' },
  { id: 'categories:edit', label: 'Manage Categories', group: 'Products', description: 'Create, edit, and organize product categories' },

  // ── Customers ──
  { id: 'customers:view', label: 'View Customers', group: 'Customers', description: 'Access customer profiles, contact numbers, emails, and order history' },

  // ── Analytics ──
  { id: 'analytics:view', label: 'View Business Analytics', group: 'Analytics', description: 'Access revenue reports, daily sales breakdowns, and top-selling product data' },

  // ── Inventory ──
  { id: 'inventory:view', label: 'View Inventory & Stock', group: 'Inventory', description: 'Monitor stock levels and view low-stock alerts' },
  { id: 'inventory:edit', label: 'Adjust Stock Counts', group: 'Inventory', description: 'Manually increment, decrement, and update stock counts for products' },

  // ── Coupons ──
  { id: 'coupons:view', label: 'View Coupons', group: 'Coupons', description: 'View active coupon codes and usage statistics' },
  { id: 'coupons:edit', label: 'Create & Edit Coupons', group: 'Coupons', description: 'Create promotional coupon codes, discounts, and minimum order requirements' },

  // ── Blogs & SEO ──
  { id: 'blogs:view', label: 'View Blogs & SEO', group: 'Blogs & SEO', description: 'View published blog articles and SEO content' },
  { id: 'blogs:edit', label: 'Generate & Publish Blogs', group: 'Blogs & SEO', description: 'Trigger AI automated blog writer, edit articles, and publish/unpublish blogs' },

  // ── Refunds ──
  { id: 'refunds:view', label: 'View Refund Requests', group: 'Refunds', description: 'Review customer refund and return claims' },
  { id: 'refunds:edit', label: 'Process & Approve Refunds', group: 'Refunds', description: 'Approve, complete, or reject refunds and trigger PhonePe refunds' },

  // ── Messages ──
  { id: 'messages:view', label: 'View Contact Messages', group: 'Messages', description: 'Read incoming inquiries from contact form and customer support' },
  { id: 'messages:edit', label: 'Manage Messages', group: 'Messages', description: 'Mark messages as read/resolved and reply to inquiries' },

  // ── Staff & Employees ──
  { id: 'staff:view', label: 'View Staff & Employees', group: 'Staff & Roles', description: 'View team members, designations, and lead allocation statistics' },
  { id: 'staff:edit', label: 'Manage Employees & Access', group: 'Staff & Roles', description: 'Create employee accounts, assign roles, edit granular page access, and reset passwords' },

  // ── Store Settings ──
  { id: 'settings:view', label: 'View Store Settings', group: 'Settings', description: 'View store configurations, shipping rates, and policies' },
  { id: 'settings:edit', label: 'Modify Store Settings', group: 'Settings', description: 'Update store branding, shipping charges, COD handling fees, and API keys' },
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { id: 'dashboard', title: 'Dashboard & Overview', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Dashboard') },
  { id: 'orders', title: 'Orders & Fulfillment', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Orders') },
  { id: 'crm', title: 'CRM & Leads Management', permissions: ALL_PERMISSIONS.filter(p => p.group === 'CRM & Leads') },
  { id: 'products', title: 'Products & Categories', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Products') },
  { id: 'customers', title: 'Customers', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Customers') },
  { id: 'analytics', title: 'Analytics & Reports', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Analytics') },
  { id: 'inventory', title: 'Inventory & Stock', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Inventory') },
  { id: 'coupons', title: 'Coupons & Discounts', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Coupons') },
  { id: 'blogs', title: 'Blogs & SEO Pipeline', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Blogs & SEO') },
  { id: 'refunds', title: 'Refund Requests', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Refunds') },
  { id: 'messages', title: 'Messages & Support', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Messages') },
  { id: 'staff', title: 'Staff & Roles Control', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Staff & Roles') },
  { id: 'settings', title: 'Store Settings', permissions: ALL_PERMISSIONS.filter(p => p.group === 'Settings') },
];

// ── ROLE PRESETS ─────────────────────────────────────────────────────────────
export const ROLE_PRESETS: Record<string, { label: string; badge: string; description: string; permissions: string[] }> = {
  super_admin: {
    label: 'Super Admin',
    badge: '🛡️ Super Admin',
    description: 'Complete unrestricted access to all pages, settings, and staff management',
    permissions: ['*'],
  },
  manager: {
    label: 'Store Manager',
    badge: '👔 Manager',
    description: 'Full operational control over orders, leads, products, inventory, coupons, and customer inquiries',
    permissions: [
      'dashboard:view',
      'orders:view', 'orders:edit',
      'crm:view', 'crm:edit', 'crm:assign', 'crm:round_robin',
      'products:view', 'products:edit',
      'categories:view', 'categories:edit',
      'customers:view',
      'analytics:view',
      'inventory:view', 'inventory:edit',
      'coupons:view', 'coupons:edit',
      'blogs:view', 'blogs:edit',
      'refunds:view', 'refunds:edit',
      'messages:view', 'messages:edit',
      'staff:view',
      'settings:view',
    ],
  },
  executive: {
    label: 'Sales / Calling Executive',
    badge: '👤 Executive',
    description: 'Focuses on contacting leads, WhatsApp inquiries, closing sales, and managing customer communications',
    permissions: [
      'crm:view', 'crm:edit',
      'orders:view',
      'customers:view',
      'messages:view', 'messages:edit',
    ],
  },
  backend: {
    label: 'Backend / Operations',
    badge: '🔧 Operations',
    description: 'Handles order processing, packing, Shiprocket tracking, inventory management, and refunds',
    permissions: [
      'orders:view', 'orders:edit',
      'inventory:view', 'inventory:edit',
      'products:view',
      'categories:view',
      'refunds:view', 'refunds:edit',
    ],
  },
  support: {
    label: 'Customer Support',
    badge: '🎧 Support',
    description: 'Manages customer messages, inquiries, order lookup, and customer satisfaction',
    permissions: [
      'messages:view', 'messages:edit',
      'orders:view',
      'crm:view', 'crm:edit',
      'customers:view',
      'refunds:view',
    ],
  },
  custom: {
    label: 'Custom Role',
    badge: '⚙️ Custom',
    description: 'Customized permission set tailored specifically for this employee',
    permissions: [],
  },
};
