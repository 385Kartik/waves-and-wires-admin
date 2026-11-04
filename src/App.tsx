import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminLayout     from '@/pages/admin/AdminLayout';
import AdminLoginPage  from '@/pages/admin/AdminLoginPage';
import AdminDashboard  from '@/pages/admin/AdminDashboard';
import AdminOrders     from '@/pages/admin/AdminOrders';
import AdminProducts   from '@/pages/admin/AdminProducts';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminCustomers  from '@/pages/admin/AdminCustomers';
import AdminAnalytics  from '@/pages/admin/AdminAnalytics';
import AdminInventory  from '@/pages/admin/AdminInventory';
import AdminCoupons    from '@/pages/admin/AdminCoupons';
import AdminSettings   from '@/pages/admin/AdminSettings';
import AdminRefunds    from '@/pages/admin/AdminRefunds';
import AdminMessages   from '@/pages/admin/AdminMessages';
import AdminLeads      from '@/pages/admin/AdminLeads';
import AdminBlogs      from '@/pages/admin/AdminBlogs';
import AdminStaff      from '@/pages/admin/AdminStaff';
import AdminInvoices   from '@/pages/admin/AdminInvoices';

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"      element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<AdminLoginPage />} />
            <Route path="/dashboard" element={<AdminLayout />}>
              <Route index          element={<AdminDashboard />} />
              <Route path="orders"     element={<AdminOrders />} />
              <Route path="invoices"   element={<AdminInvoices />} />
              <Route path="leads"      element={<AdminLeads />} />
              <Route path="staff"      element={<AdminStaff />} />
              <Route path="products"   element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="customers"  element={<AdminCustomers />} />
              <Route path="analytics"  element={<AdminAnalytics />} />
              <Route path="inventory"  element={<AdminInventory />} />
              <Route path="coupons"    element={<AdminCoupons />} />
              <Route path="refunds"    element={<AdminRefunds />} />
              <Route path="blogs"      element={<AdminBlogs />} />
              <Route path="messages"   element={<AdminMessages />} />
              <Route path="settings"   element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}
