// api/update-phone-auth.js
// Server-side: update auth.users email when user changes phone number.
// Uses admin API to bypass email confirmation (internal emails like @ww.internal
// don't receive mail, so client-side supabase.auth.updateUser won't work).
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_ORIGINS = [
  process.env.SITE_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user_id, new_phone } = req.body ?? {};
    if (!user_id || !new_phone) {
      return res.status(400).json({ error: 'user_id and new_phone required' });
    }

    // Verify the calling user is who they claim to be
    const authHeader = req.headers.authorization ?? '';
    const token      = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user: callingUser }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !callingUser || callingUser.id !== user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Normalize phone and generate new internal email
    const digits    = new_phone.replace(/\D/g, '');
    const formatted = digits.startsWith('91') && digits.length === 12
      ? `+${digits}`
      : digits.length === 10 ? `+91${digits}` : `+${digits}`;

    const newInternalEmail = `ph_${formatted.replace('+', '')}@ww.internal`;

    // Use admin API — bypasses email confirmation flow
    const { error } = await supabase.auth.admin.updateUserById(user_id, {
      email: newInternalEmail,
    });

    if (error) {
      console.error('[UpdatePhoneAuth] Error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[UpdatePhoneAuth] Auth email updated for user ${user_id} → ${newInternalEmail}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[UpdatePhoneAuth] Unexpected error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}