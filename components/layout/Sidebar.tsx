'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

const navItems = [
  { href: '/', label: 'Business Dashboard', icon: '▦' },
  { href: '/flow-setups', label: 'Flow Setups', icon: '⟲' },
  { href: '/clients', label: 'Clients', icon: '⊞' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isPM, setIsPM] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
      setIsPM(data.user?.user_metadata?.role === 'pm');
    });
  }, []);

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-5 py-5 border-b border-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Fluid Creatives" className="w-full object-contain" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.filter((item) => !isPM || item.href !== '/').map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700 space-y-2">
        {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
        <button
          onClick={handleSignOut}
          className="w-full text-left text-xs text-gray-500 hover:text-white transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
