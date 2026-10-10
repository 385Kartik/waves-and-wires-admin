import os
import re

files = [
    "src/contexts/AuthContext.tsx",
    "src/hooks/useStoreSettings.ts",
    "src/pages/admin/AdminAnalytics.tsx",
    "src/pages/admin/AdminCategories.tsx",
    "src/pages/admin/AdminCoupons.tsx",
    "src/pages/admin/AdminCustomers.tsx",
    "src/pages/admin/AdminDashboard.tsx",
    "src/pages/admin/AdminInventory.tsx",
    "src/pages/admin/AdminLayout.tsx",
    "src/pages/admin/AdminLoginPage.tsx",
    "src/pages/admin/AdminMessages.tsx",
    "src/pages/admin/AdminOrders.tsx",
    "src/pages/admin/AdminProducts.tsx",
    "src/pages/admin/AdminRefunds.tsx",
    "src/pages/admin/AdminSettings.tsx"
]

def refactor_file(filepath):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove supabase imports
    content = re.sub(r"import\s*\{\s*Session\s*\}\s*from\s*'@supabase/supabase-js';\n?", "", content)
    content = re.sub(r"import\s*\{\s*supabase\s*\}\s*from\s*'@/lib/supabase';\n?", "", content)

    # We'll just append necessary imports at the top
    imports = []
    
    if "supabase.from('admin_dashboard_stats')" in content or "supabase.from('admin_revenue_by_day')" in content or "supabase.from('admin_top_products')" in content or "supabase.from('store_settings')" in content or "supabase.from('coupons')" in content:
        imports.append("import { adminService } from '@/services/admin.service';")
    if "supabase.from('orders')" in content or "supabase.from('order_items')" in content:
        imports.append("import { orderService } from '@/services/order.service';")
    if "supabase.from('products')" in content:
        imports.append("import { productService } from '@/services/product.service';")
    if "supabase.from('categories')" in content:
        imports.append("import { categoryService } from '@/services/category.service';")
    if "supabase.auth" in content:
        imports.append("import { authService } from '@/services/auth.service';")
        
    if imports:
        # insert after last import
        matches = list(re.finditer(r"^import.*$", content, re.MULTILINE))
        if matches:
            last_import = matches[-1]
            pos = last_import.end()
            content = content[:pos] + "\n" + "\n".join(imports) + content[pos:]

    # Auto-replace queries
    content = content.replace("supabase.from('admin_dashboard_stats').select('*').single()", "adminService.getDashboardStats()")
    content = content.replace("supabase.from('admin_revenue_by_day').select('*').order('date', { ascending: true }).limit(30)", "adminService.getRevenueByDay()")
    content = content.replace("supabase.from('admin_revenue_by_day').select('*').order('date', { ascending: true })", "adminService.getRevenueByDay()")
    content = content.replace("supabase.from('admin_top_products').select('*')", "adminService.getTopProducts()")
    
    # orders query in dashboard
    content = content.replace("supabase.from('orders')\n          .select('id, order_number, status, total, created_at, shipping_address')\n          .order('created_at', { ascending: false })\n          .limit(8)", "orderService.getOrders()")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for f in files:
    refactor_file(f)
