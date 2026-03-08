/**
 * HustleOS — Full App
 * Features: Notifications, Analytics, Tags, Export, Theme Toggle,
 *           Skeleton loaders, Empty states, Bug fixes, Mobile polish
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, PlusCircle, DollarSign, Clock, Briefcase, ChevronRight,
  User, ArrowLeft, CheckCircle2, ExternalLink, Edit2, X, Search,
  ArrowUp, ArrowDown, SlidersHorizontal, Camera, Bell, Check, XCircle,
  RefreshCw, Star, BarChart2, Download, Tag, Sun, Moon, Trash2, TrendingUp,
  Award, Users, Activity, Filter
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Gig, UserProfile, ContractRequest, HiredGig, Review, Notification, Analytics } from './types';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ─── Theme Context ────────────────────────────────────────────────────────────
const ThemeContext = React.createContext<{ theme: 'dark'|'light'; toggle: () => void }>({ theme: 'dark', toggle: () => {} });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDeliveryDays(deliveryTime: string): number {
  const m = String(deliveryTime).match(/(\d+)/);
  return m ? parseInt(m[1]) : 7;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-xl bg-white/5', className)} />
);

const GigSkeleton = () => (
  <div className="glass rounded-2xl p-6 space-y-3">
    <div className="flex justify-between">
      <div className="space-y-2 flex-1"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-32" /></div>
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
  </div>
);

// ─── Base Components ──────────────────────────────────────────────────────────
const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props} className={cn('glass rounded-2xl p-6', className)}>{children}</div>
);

const Button = ({ children, onClick, className, variant = 'primary', disabled = false, type = 'button' }:
  { children: React.ReactNode; onClick?: () => void; className?: string; variant?: 'primary'|'secondary'|'ghost'|'danger'; disabled?: boolean; type?: 'button'|'submit' }) => {
  const v = {
    primary: 'bg-brand-purple hover:bg-brand-purple/80 text-white shadow-lg shadow-brand-purple/20',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-300',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={cn('px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100', v[variant], className)}>
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg glass rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
          </div>
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const TagBadge = ({ tag, onRemove }: { tag: string; onRemove?: () => void }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
    <Tag size={10} />{tag}
    {onRemove && <button onClick={onRemove} className="ml-1 hover:text-white"><X size={10} /></button>}
  </span>
);

const ModeToggle = ({ mode, setMode }: { mode: 'freelancer'|'employer'; setMode: (m: 'freelancer'|'employer') => void }) => (
  <div className="bg-black/20 p-1 rounded-2xl flex relative w-64 h-12 border border-white/5 shadow-2xl">
    <motion.div className={cn('absolute top-1 bottom-1 rounded-xl', mode === 'freelancer' ? 'bg-brand-purple shadow-[0_0_15px_rgba(109,40,217,0.4)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]')}
      initial={false} animate={{ x: mode === 'freelancer' ? 0 : 124, width: 124 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
    {(['freelancer','employer'] as const).map(m => (
      <button key={m} onClick={() => setMode(m)} className={cn('flex-1 relative z-10 text-sm font-bold transition-colors capitalize', mode === m ? 'text-white' : 'text-slate-500 hover:text-slate-400')}>{m}</button>
    ))}
  </div>
);

// ─── Tag Input ────────────────────────────────────────────────────────────────
const TagInput = ({ tags, onChange, suggestions = [] }: { tags: string[]; onChange: (tags: string[]) => void; suggestions?: string[] }) => {
  const [input, setInput] = useState('');
  const add = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {tags.map(t => <TagBadge key={t} tag={t} onRemove={() => onChange(tags.filter(x => x !== t))} />)}
      </div>
      <input
        placeholder="Add tag, press Enter..."
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-purple transition-colors"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
      />
      {suggestions.filter(s => !tags.includes(s) && s.includes(input.toLowerCase()) && input).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.filter(s => !tags.includes(s) && s.includes(input.toLowerCase()) && input).map(s => (
            <button key={s} onClick={() => add(s)} className="text-xs px-2 py-1 rounded-full bg-white/5 hover:bg-brand-purple/20 text-slate-400 hover:text-brand-purple transition-colors border border-white/10">
              +{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Notifications Panel ──────────────────────────────────────────────────────
const NotificationsPanel = ({ onClose }: { onClose: () => void }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    setNotifications(data.notifications);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
  };

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const iconMap: Record<string, React.ReactNode> = {
    contract_request: <Briefcase size={16} className="text-brand-purple" />,
    renewal_request: <RefreshCw size={16} className="text-amber-400" />,
    contract_accepted: <CheckCircle2 size={16} className="text-emerald-400" />,
    contract_declined: <XCircle size={16} className="text-red-400" />,
    new_review: <Star size={16} className="text-amber-400" />,
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute right-0 top-12 w-96 max-h-[32rem] overflow-hidden glass rounded-2xl shadow-2xl z-50 flex flex-col border border-white/10">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-bold text-sm uppercase tracking-wider">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button onClick={markAllRead} className="text-xs text-brand-purple hover:text-brand-purple/80 transition-colors">Mark all read</button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X size={16} /></button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map(n => (
              <div key={n.id} className={cn('flex items-start gap-3 p-4 hover:bg-white/5 transition-colors group', !n.read && 'bg-brand-purple/5')}>
                <div className={cn('p-2 rounded-lg mt-0.5 flex-shrink-0', !n.read ? 'bg-brand-purple/10' : 'bg-white/5')}>
                  {iconMap[n.type] ?? <Bell size={16} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', !n.read ? 'text-white' : 'text-slate-300')}>{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <button onClick={() => deleteNotification(n.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all flex-shrink-0">
                  <X size={12} className="text-slate-500" />
                </button>
                {!n.read && <div className="w-2 h-2 rounded-full bg-brand-purple flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
const ThemeToggle = () => {
  const { theme, toggle } = React.useContext(ThemeContext);
  return (
    <button onClick={toggle} className="p-2.5 glass rounded-xl hover:bg-white/10 transition-colors" title="Toggle theme">
      {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-400" />}
    </button>
  );
};

// ─── Gig Card ─────────────────────────────────────────────────────────────────
const GigCard = ({ gig, mode, onEdit, onExpand, isExpanded }: {
  gig: Gig; mode: 'freelancer'|'employer'; onEdit?: (g: Gig) => void; onExpand: () => void; isExpanded: boolean;
}) => {
  const tags = Array.isArray(gig.tags) ? gig.tags : [];
  return (
    <motion.div layout initial={false} className="overflow-hidden">
      <Card className={cn('cursor-pointer transition-all duration-300', isExpanded ? 'bg-white/10' : 'hover:bg-white/[0.08]')} onClick={onExpand}>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg leading-tight">{gig.service_name}</h3>
              {gig.avg_rating != null && (
                <div className="flex items-center gap-1 text-amber-400 text-xs bg-amber-400/10 px-2 py-0.5 rounded-full">
                  <Star size={10} fill="currentColor" /><span>{gig.avg_rating.toFixed(1)}</span>
                  <span className="text-slate-500">({gig.review_count})</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1"><DollarSign size={12} />{gig.price}</span>
              <span className="flex items-center gap-1"><Clock size={12} />{gig.delivery_time}</span>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                gig.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400')}>{gig.status}</span>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">{tags.slice(0,4).map(t => <TagBadge key={t} tag={t} />)}</div>
            )}
          </div>
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="text-slate-600 flex-shrink-0" />
          </motion.div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
              <div className="pt-5 space-y-4 border-t border-white/10 mt-4">
                <p className="text-slate-300 leading-relaxed text-sm">{gig.description}</p>
                <div className="flex justify-end items-center gap-4">
                  {mode === 'freelancer' && onEdit && (
                    <button onClick={e => { e.stopPropagation(); onEdit(gig); }}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                      <Edit2 size={14} />Edit
                    </button>
                  )}
                  <Link to={`/portal/${gig.id}`} onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-brand-purple hover:text-brand-purple/80 transition-colors text-sm font-medium">
                    {mode === 'freelancer' ? 'View Portal' : 'View & Hire'}<ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// ─── Analytics Page ───────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const exportCSV = async (type: 'gigs'|'earnings') => {
    const a = document.createElement('a');
    a.href = `/api/export/${type}.csv`;
    a.download = `hustleos-${type}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="space-y-8">
      <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-8 w-48" /></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28" />)}</div>
    </div>
  );

  if (!data) return null;
  const { summary, monthlyEarnings, topGigs, ratingDist, contractBreakdown } = data;

  const maxEarnings = Math.max(...monthlyEarnings.map(m => m.earnings), 1);

  const statCards = [
    { label: 'Total Earned', value: `$${summary.totalEarned.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Gigs', value: summary.totalGigs, icon: <Briefcase size={20} />, color: 'text-brand-purple', bg: 'bg-brand-purple/10' },
    { label: 'Active Gigs', value: summary.activeGigs, icon: <Activity size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Contracts', value: summary.totalContracts, icon: <Users size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Avg Rating', value: summary.avgRating ? `${summary.avgRating}★` : 'N/A', icon: <Star size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Reviews', value: summary.totalReviews, icon: <Award size={20} />, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart2 size={24} className="text-brand-purple" />Analytics</h1>
            <p className="text-slate-400 text-sm">Your performance overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="flex items-center gap-2 py-2 px-4 text-sm" onClick={() => exportCSV('gigs')}>
            <Download size={16} />Export Gigs
          </Button>
          <Button variant="secondary" className="flex items-center gap-2 py-2 px-4 text-sm" onClick={() => exportCSV('earnings')}>
            <Download size={16} />Export Earnings
          </Button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map(({ label, value, icon, color, bg }) => (
          <motion.div key={label} whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
            <Card className="flex items-center gap-4">
              <div className={cn('p-3 rounded-xl flex-shrink-0', bg, color)}>{icon}</div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
                <p className={cn('text-2xl font-bold font-mono', color)}>{value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Monthly Earnings Chart */}
      <Card className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><TrendingUp size={18} className="text-brand-purple" />Monthly Earnings</h3>
        {monthlyEarnings.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No earnings data yet</div>
        ) : (
          <div className="flex items-end gap-2 h-40 pt-4">
            {monthlyEarnings.map((m, i) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex justify-center">
                  <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-emerald-400 font-mono whitespace-nowrap bg-slate-900 px-2 py-1 rounded-lg border border-white/10">
                    ${m.earnings.toLocaleString()}
                  </div>
                  <motion.div
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                    style={{ height: `${Math.max((m.earnings / maxEarnings) * 120, 4)}px`, originY: 1 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-purple to-purple-400 group-hover:from-brand-purple group-hover:to-purple-300 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-500 truncate w-full text-center">{m.month.slice(5)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Gigs */}
        <Card className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Award size={18} className="text-amber-400" />Top Performing Gigs</h3>
          {topGigs.length === 0 ? (
            <p className="text-slate-500 text-sm">No gig data yet</p>
          ) : (
            <div className="space-y-3">
              {topGigs.map((g, i) => (
                <div key={g.service_name} className="flex items-center gap-3">
                  <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    i === 0 ? 'bg-amber-400/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-400' : 'bg-amber-700/20 text-amber-700')}>
                    {i+1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.service_name}</p>
                    <p className="text-xs text-slate-500">{g.hires} hires • {g.avg_rating ? `${g.avg_rating}★` : 'No reviews'}</p>
                  </div>
                  <span className="text-emerald-400 font-mono text-sm font-bold">${g.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Rating Distribution */}
        <Card className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Star size={18} className="text-amber-400" />Rating Distribution</h3>
          {ratingDist.length === 0 ? (
            <p className="text-slate-500 text-sm">No reviews yet</p>
          ) : (
            <div className="space-y-2">
              {[5,4,3,2,1].map(rating => {
                const found = ratingDist.find(r => r.rating === rating);
                const count = found?.count ?? 0;
                const total = ratingDist.reduce((s, r) => s + r.count, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-4">{rating}</span>
                    <Star size={10} fill="currentColor" className="text-amber-400" />
                    <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3, duration: 0.6 }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = ({ mode, setMode }: { mode: 'freelancer'|'employer'; setMode: (m: 'freelancer'|'employer') => void }) => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedGigId, setExpandedGigId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'created_at'|'price'|'avg_rating'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  const [editingGigTags, setEditingGigTags] = useState<string[]>([]);
  const [contractRequests, setContractRequests] = useState<ContractRequest[]>([]);
  const [hiredGigs, setHiredGigs] = useState<HiredGig[]>([]);
  const [isContractsCollapsed, setIsContractsCollapsed] = useState(false);
  const [pendingRenewals, setPendingRenewals] = useState<Record<string, boolean>>({});
  const [reviewingGigId, setReviewingGigId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [gigsRes, profileRes, requestsRes, hiredRes, notifRes, tagsRes] = await Promise.all([
        fetch('/api/gigs'), fetch('/api/profile'), fetch('/api/contracts/requests'),
        fetch('/api/hired'), fetch('/api/notifications'), fetch('/api/tags'),
      ]);
      const [gigsData, profileData, requestsData, hiredData, notifData, tagsData] = await Promise.all([
        gigsRes.json(), profileRes.json(), requestsRes.json(), hiredRes.json(), notifRes.json(), tagsRes.json(),
      ]);
      setGigs(gigsData.map((g: any) => ({ ...g, tags: (() => { try { return JSON.parse(g.tags || '[]'); } catch { return []; } })() })));
      setProfile(profileData);
      setNewBio(profileData.bio);
      setContractRequests(requestsData);
      setHiredGigs(hiredData);
      setUnreadCount(notifData.unread);
      setAvailableTags(tagsData);
      const pendingMap: Record<string, boolean> = {};
      hiredData.forEach((h: HiredGig) => { if (h.renewal_status === 'pending') pendingMap[h.id] = true; });
      setPendingRenewals(pendingMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close notifications on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleContractResponse = async (requestId: string, status: 'accepted'|'declined') => {
    await fetch(`/api/contracts/respond/${requestId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setContractRequests(prev => prev.filter(r => r.id !== requestId));
    if (status === 'accepted') fetchData();
  };

  const handleRenewRequest = async (hired: HiredGig) => {
    if (pendingRenewals[hired.id]) return;
    await fetch(`/api/contracts/request/${hired.gig_id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'renewal', client_name: profile?.name || 'Client', hired_gig_id: hired.id }),
    });
    setPendingRenewals(prev => ({ ...prev, [hired.id]: true }));
  };

  const handleSubmitReview = async () => {
    if (!reviewingGigId || !reviewComment) return;
    setSubmittingReview(true);
    await fetch(`/api/reviews/${reviewingGigId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: profile?.name || 'Client', rating: reviewRating, comment: reviewComment }),
    });
    setReviewingGigId(null); setReviewComment(''); setReviewRating(5);
    fetchData();
    setSubmittingReview(false);
  };

  const handleSaveBio = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio: newBio }) });
    setProfile(prev => prev ? { ...prev, bio: newBio } : null);
    setIsEditModalOpen(false); setSaving(false);
  };

  const handleUpdateGig = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingGig) return; setSaving(true);
    await fetch(`/api/gigs/${editingGig.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editingGig, tags: editingGigTags }),
    });
    setGigs(prev => prev.map(g => g.id === editingGig.id ? { ...editingGig, tags: editingGigTags } : g));
    setEditingGig(null); setSaving(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (file.size > 5_000_000) { setImageError('Image must be under 5MB.'); return; }
    // Compress via canvas
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const MAX = 512;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width = img.width * ratio; canvas.height = img.height * ratio;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(url);
      const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_image: base64 }) });
      if (res.ok) setProfile(prev => prev ? { ...prev, profile_image: base64 } : null);
    };
    img.src = url;
  };

  // Filter + sort gigs
  const filteredGigs = gigs
    .filter(g =>
      (g.service_name.toLowerCase().includes(searchQuery.toLowerCase()) || g.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (minPrice === '' || g.price >= parseFloat(minPrice)) &&
      (maxPrice === '' || g.price <= parseFloat(maxPrice)) &&
      (selectedTag === '' || (g.tags ?? []).includes(selectedTag))
    )
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'price') cmp = a.price - b.price;
      else if (sortBy === 'avg_rating') cmp = (a.avg_rating ?? 0) - (b.avg_rating ?? 0);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  if (loading) return (
    <div className="space-y-8">
      <div className="flex items-center gap-6"><Skeleton className="w-24 h-24 rounded-2xl" /><div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-32" /></div></div>
      <div className="space-y-3">{[1,2,3].map(i => <GigSkeleton key={i} />)}</div>
    </div>
  );

  const activeContracts = hiredGigs.filter(h => h.renewal_status === 'none' || h.renewal_status === 'rejected');
  const renewedContracts = hiredGigs.filter(h => h.renewal_status === 'pending' || h.renewal_status === 'accepted');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl overflow-hidden glass border-2 border-white/10 group-hover:border-brand-purple/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {profile?.profile_image ? (
                <img src={profile.profile_image} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5 text-slate-500"><User size={40} /></div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HustleOS</h1>
            <p className="text-slate-400">Welcome back, {profile?.name}</p>
            {imageError && <p className="text-xs text-red-400 mt-1">{imageError}</p>}
            <div className="mt-4"><ModeToggle mode={mode} setMode={setMode} /></div>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3">
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 glass rounded-xl hover:bg-white/10 transition-colors">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand-purple text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
              </AnimatePresence>
            </div>
            <ThemeToggle />
            <Link to="/analytics" className="p-2.5 glass rounded-xl hover:bg-white/10 transition-colors" title="Analytics">
              <BarChart2 size={18} />
            </Link>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{mode === 'freelancer' ? 'Total Earned' : 'Total Spent'}</p>
            <p className="text-3xl font-mono font-bold text-emerald-400">${profile?.total_earned.toLocaleString()}</p>
          </div>
        </div>
      </header>

      {/* Freelancer top cards */}
      {mode === 'freelancer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Your Bio</h3>
              <p className="text-slate-200 line-clamp-3">{profile?.bio}</p>
            </div>
            <Button variant="secondary" className="mt-4 py-2 px-4 text-sm flex items-center gap-2 w-fit" onClick={() => setIsEditModalOpen(true)}>
              <Edit2 size={14} />Edit Bio
            </Button>
          </Card>
          <Link to="/create" className="group">
            <Card className="flex items-center justify-between hover:bg-white/[0.08] transition-colors h-full">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-purple/20 rounded-xl text-brand-purple"><PlusCircle size={24} /></div>
                <div>
                  <h3 className="font-semibold">New Service</h3>
                  <p className="text-sm text-slate-400">Launch a new gig</p>
                </div>
              </div>
              <ChevronRight className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </Card>
          </Link>
        </div>
      )}

      {/* Contract Requests (freelancer) */}
      {mode === 'freelancer' && contractRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell size={20} className="text-brand-purple animate-pulse" />Contract Requests
            <span className="text-xs bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full">{contractRequests.length}</span>
          </h2>
          {contractRequests.map(request => (
            <motion.div key={request.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card className="flex items-center justify-between border-brand-purple/20 bg-brand-purple/5 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn('p-3 rounded-xl flex-shrink-0', request.type === 'renewal' ? 'bg-amber-500/20 text-amber-500' : 'bg-brand-purple/20 text-brand-purple')}>
                    {request.type === 'renewal' ? <RefreshCw size={20} /> : <Briefcase size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{request.type === 'renewal' ? 'Contract Renewal' : 'New Contract'}</h3>
                    <p className="text-sm text-slate-400 truncate">
                      From <span className="text-white font-medium">{request.client_name}</span> • {request.service_name} • <span className="text-emerald-400 font-mono">${request.price}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleContractResponse(request.id, 'declined')} className="p-2.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl transition-colors" title="Decline">
                    <XCircle size={20} />
                  </button>
                  <button onClick={() => handleContractResponse(request.id, 'accepted')} className="p-2.5 hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 rounded-xl transition-colors" title="Accept">
                    <Check size={20} />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </section>
      )}

      {/* Active Contracts (freelancer) */}
      {mode === 'freelancer' && hiredGigs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between cursor-pointer group" onClick={() => setIsContractsCollapsed(!isContractsCollapsed)}>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-400" />Active Client Contracts
              <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{hiredGigs.length}</span>
            </h2>
            <motion.div animate={{ rotate: isContractsCollapsed ? 0 : 90 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="text-slate-500 group-hover:text-slate-300 transition-colors" />
            </motion.div>
          </div>
          <AnimatePresence>
            {!isContractsCollapsed && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                {hiredGigs.map(hired => {
                  const deliveryDays = parseDeliveryDays(hired.delivery_time);
                  const dueDate = new Date(hired.hired_at);
                  dueDate.setDate(dueDate.getDate() + deliveryDays);
                  const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
                  return (
                    <Card key={hired.id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl flex-shrink-0"><User size={20} /></div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{hired.client_name}</h3>
                          <p className="text-sm text-slate-400 truncate">{hired.service_name} • <span className="text-emerald-400 font-mono">${hired.price}</span></p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn('text-sm font-bold', diffDays < 0 ? 'text-red-400' : diffDays <= 1 ? 'text-amber-400' : 'text-slate-400')}>
                          {diffDays < 0 ? 'Overdue' : diffDays === 0 ? 'Due Today' : `${diffDays}d left`}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase">Deadline</p>
                      </div>
                    </Card>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Gigs Section */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Briefcase size={20} className="text-brand-purple" />
            {mode === 'freelancer' ? 'Your Gigs' : 'Available Services'}
          </h2>
          <div className="flex items-center gap-2 w-full md:max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-brand-purple transition-colors text-sm" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={14} /></button>
              )}
            </div>
            <Button variant={showFilters ? 'primary' : 'secondary'} className="px-4 py-3 flex items-center gap-2 flex-shrink-0" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={16} /><span className="hidden sm:inline text-sm">Filter</span>
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Card className="bg-white/5 border-white/5 p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Min Price</label>
                  <input type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Max Price</label>
                  <input type="number" placeholder="Any" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sort By</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple transition-colors">
                    <option value="created_at" className="bg-slate-900">Date</option>
                    <option value="price" className="bg-slate-900">Price</option>
                    <option value="avg_rating" className="bg-slate-900">Rating</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Order</label>
                  <Button variant="secondary" className="w-full py-2 px-3 flex items-center justify-between text-sm" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
                    <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
                    {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  </Button>
                </div>
                {availableTags.length > 0 && (
                  <div className="col-span-2 md:col-span-4 space-y-1.5">
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1"><Filter size={10} />Filter by Tag</label>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setSelectedTag('')} className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', selectedTag === '' ? 'bg-brand-purple/20 border-brand-purple/40 text-brand-purple' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20')}>All</button>
                      {availableTags.map(t => (
                        <button key={t} onClick={() => setSelectedTag(selectedTag === t ? '' : t)}
                          className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1',
                            selectedTag === t ? 'bg-brand-purple/20 border-brand-purple/40 text-brand-purple' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20')}>
                          <Tag size={9} />{t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="col-span-2 md:col-span-4 flex justify-end">
                  <Button variant="ghost" className="text-sm py-1.5 px-3" onClick={() => { setMinPrice(''); setMaxPrice(''); setSelectedTag(''); setSortBy('created_at'); setSortOrder('desc'); }}>
                    Clear all
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Employer hired contracts */}
        {mode === 'employer' && hiredGigs.length > 0 && (
          <div className="space-y-6 mb-4">
            {renewedContracts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2"><RefreshCw size={18} className="text-emerald-400" />Renewed Contracts</h3>
                {renewedContracts.map(hired => (
                  <Card key={hired.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{hired.service_name}</h4>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase',
                          hired.renewal_status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400')}>
                          {hired.renewal_status === 'pending' ? 'Renewal Pending' : 'Renewed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400"><span className="text-emerald-400 font-mono">${hired.price}</span> • {hired.delivery_time}</p>
                    </div>
                    <Button variant="ghost" className="flex items-center gap-1.5 py-2 px-3 text-sm text-amber-400 hover:bg-amber-400/10 flex-shrink-0" onClick={() => setReviewingGigId(hired.gig_id)}>
                      <Star size={14} />Review
                    </Button>
                  </Card>
                ))}
              </div>
            )}
            {activeContracts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Briefcase size={18} className="text-brand-purple" />Running Contracts</h3>
                {activeContracts.map(hired => {
                  const deliveryDays = parseDeliveryDays(hired.delivery_time);
                  const dueDate = new Date(hired.hired_at);
                  dueDate.setDate(dueDate.getDate() + deliveryDays);
                  const isExpired = Date.now() > dueDate.getTime();
                  const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
                  const canRenew = !isExpired && diffDays <= 1;
                  return (
                    <Card key={hired.id} className={cn('flex items-center justify-between gap-4', isExpired && 'opacity-60')}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{hired.service_name}</h4>
                          {isExpired && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-red-500/10 text-red-400">Expired</span>}
                          {hired.renewal_status === 'rejected' && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-red-500/10 text-red-400">Renewal Rejected</span>}
                        </div>
                        <p className="text-xs text-slate-400">
                          <span className="text-emerald-400 font-mono">${hired.price}</span> • {hired.delivery_time} • <span className={cn(isExpired && 'text-red-400')}>
                            {isExpired ? `Expired ${dueDate.toLocaleDateString()}` : `Expires ${dueDate.toLocaleDateString()}`}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="ghost" className="flex items-center gap-1.5 py-2 px-3 text-sm text-amber-400 hover:bg-amber-400/10" onClick={() => setReviewingGigId(hired.gig_id)}>
                          <Star size={14} />Review
                        </Button>
                        {canRenew && (
                          <Button variant="secondary" disabled={pendingRenewals[hired.id]} className={cn('flex items-center gap-1.5 py-2 px-3 text-sm', pendingRenewals[hired.id] && 'opacity-70 bg-emerald-500/10 text-emerald-400 border-emerald-500/20')}
                            onClick={() => handleRenewRequest(hired)}>
                            {pendingRenewals[hired.id] ? <><CheckCircle2 size={14} />Sent</> : <><RefreshCw size={14} />Renew</>}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            <hr className="border-white/10" />
          </div>
        )}

        {/* Gig list */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredGigs.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto flex items-center justify-center">
                    <Briefcase size={28} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">
                      {searchQuery || minPrice || maxPrice || selectedTag ? 'No results match your filters' : 'No gigs yet — create your first one!'}
                    </p>
                    {(searchQuery || minPrice || maxPrice || selectedTag) && (
                      <button onClick={() => { setSearchQuery(''); setMinPrice(''); setMaxPrice(''); setSelectedTag(''); }}
                        className="mt-3 text-brand-purple text-sm hover:underline">Clear filters</button>
                    )}
                  </div>
                  {mode === 'freelancer' && !searchQuery && !minPrice && !maxPrice && !selectedTag && (
                    <Link to="/create"><Button className="mt-2">Create First Gig</Button></Link>
                  )}
                </Card>
              </motion.div>
            ) : (
              filteredGigs.map((gig, i) => (
                <motion.div key={gig.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <GigCard gig={gig} mode={mode} isExpanded={expandedGigId === gig.id}
                    onExpand={() => setExpandedGigId(expandedGigId === gig.id ? null : gig.id)}
                    onEdit={g => { setEditingGig(g); setEditingGigTags(g.tags ?? []); }} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Edit Bio Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Bio">
        <form onSubmit={handleSaveBio} className="space-y-6">
          <textarea required rows={4} value={newBio} onChange={e => setNewBio(e.target.value)} placeholder="Tell clients what you do..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-brand-purple transition-colors resize-none text-sm" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Gig Modal */}
      <Modal isOpen={!!editingGig} onClose={() => setEditingGig(null)} title="Edit Gig">
        {editingGig && (
          <form onSubmit={handleUpdateGig} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Service Name</label>
              <input required value={editingGig.service_name} onChange={e => setEditingGig({...editingGig, service_name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-purple transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Description</label>
              <textarea required rows={3} value={editingGig.description} onChange={e => setEditingGig({...editingGig, description: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-purple transition-colors resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Price ($)</label>
                <input required type="number" value={editingGig.price} onChange={e => setEditingGig({...editingGig, price: parseFloat(e.target.value)})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-purple transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Delivery Time</label>
                <input required value={editingGig.delivery_time} onChange={e => setEditingGig({...editingGig, delivery_time: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-purple transition-colors" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status</label>
              <select value={editingGig.status} onChange={e => setEditingGig({...editingGig, status: e.target.value as any})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-brand-purple transition-colors">
                <option value="active" className="bg-slate-900">Active</option>
                <option value="paused" className="bg-slate-900">Paused</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tags</label>
              <TagInput tags={editingGigTags} onChange={setEditingGigTags} suggestions={availableTags} />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setEditingGig(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal isOpen={!!reviewingGigId} onClose={() => { setReviewingGigId(null); setReviewComment(''); setReviewRating(5); }} title="Leave a Review">
        <div className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setReviewRating(s)} className="p-1 transition-transform hover:scale-110 active:scale-95">
                <Star size={32} fill={s <= reviewRating ? 'currentColor' : 'none'} className={s <= reviewRating ? 'text-amber-400' : 'text-slate-600'} />
              </button>
            ))}
          </div>
          <textarea rows={4} placeholder="Share your experience..." value={reviewComment} onChange={e => setReviewComment(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-brand-purple transition-colors resize-none text-sm" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setReviewingGigId(null)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmitReview} disabled={submittingReview || !reviewComment}>
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

// ─── Gig Creator ──────────────────────────────────────────────────────────────
const GigCreator = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ service_name: '', description: '', price: '', delivery_time: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { fetch('/api/tags').then(r => r.json()).then(setAvailableTags); }, []);

  const handleConfirm = async () => {
    setSubmitting(true); setShowConfirm(false);
    await fetch('/api/gigs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, price: parseFloat(formData.price), tags }) });
    navigate('/');
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={24} /></button>
        <div>
          <h1 className="text-2xl font-bold">Create Service</h1>
          <p className="text-slate-400 text-sm">Launch a new gig to the marketplace</p>
        </div>
      </header>

      <form onSubmit={e => { e.preventDefault(); setShowConfirm(true); }} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Service Name</label>
          <input required placeholder="e.g. Logo Design" value={formData.service_name} onChange={e => setFormData({...formData, service_name: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-brand-purple transition-colors" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Description</label>
          <textarea required rows={4} placeholder="Describe your offering in detail..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-brand-purple transition-colors resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Price ($)</label>
            <input required type="number" min="1" placeholder="99" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-brand-purple transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Delivery Time</label>
            <input required placeholder="e.g. 3 days" value={formData.delivery_time} onChange={e => setFormData({...formData, delivery_time: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-brand-purple transition-colors" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1"><Tag size={10} />Tags</label>
          <TagInput tags={tags} onChange={setTags} suggestions={availableTags} />
          <p className="text-xs text-slate-600">Press Enter to add a tag. Tags help clients find your service.</p>
        </div>
        <Button type="submit" disabled={submitting} className="w-full py-4 text-lg mt-2">Launch Service</Button>
      </form>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Launch">
        <div className="space-y-6">
          <div className="p-4 bg-brand-purple/10 rounded-xl border border-brand-purple/20 space-y-1">
            <p className="text-slate-300">Launch <span className="text-white font-bold">"{formData.service_name}"</span> for <span className="text-emerald-400 font-bold">${formData.price}</span>?</p>
            <p className="text-xs text-slate-500">This will make the service live on your public portal immediately.</p>
            {tags.length > 0 && <div className="flex flex-wrap gap-1 pt-2">{tags.map(t => <TagBadge key={t} tag={t} />)}</div>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={submitting}>{submitting ? 'Launching...' : 'Confirm & Launch'}</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

// ─── Reviews List ─────────────────────────────────────────────────────────────
const ReviewsList = ({ gigId }: { gigId: string }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/reviews/${gigId}`).then(r => r.json()).then(d => { setReviews(d); setLoading(false); });
  }, [gigId]);

  if (loading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (reviews.length === 0) return (
    <div className="text-center py-8 text-slate-500">
      <Star size={24} className="mx-auto mb-2 opacity-30" />
      <p className="text-sm">No reviews yet. Be the first!</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <Card key={review.id} className="bg-white/5 border-white/5 p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center text-brand-purple font-bold text-xs">
                {review.client_name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{review.client_name}</p>
                <p className="text-[10px] text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} className={i < review.rating ? 'text-amber-400' : 'text-slate-600'} />
              ))}
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">{review.comment}</p>
        </Card>
      ))}
    </div>
  );
};

// ─── Portal ───────────────────────────────────────────────────────────────────
const Portal = ({ mode }: { mode: 'freelancer'|'employer' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState<Gig | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hired, setHired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetch(`/api/gigs/${id}`), fetch('/api/profile')]).then(async ([gigRes, profRes]) => {
      if (gigRes.ok) {
        const g = await gigRes.json();
        setGig({ ...g, tags: (() => { try { return JSON.parse(g.tags || '[]'); } catch { return []; } })() });
      }
      setProfile(await profRes.json());
      setLoading(false);
    });
  }, [id]);

  const handleHire = async () => {
    if (mode === 'freelancer') { alert('Switch to Employer mode to hire.'); return; }
    if (!clientName) { setShowClientModal(true); return; }
    setSubmitting(true);
    await fetch(`/api/contracts/request/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: hired ? 'renewal' : 'initial', client_name: clientName }),
    });
    setHired(true); setShowClientModal(false); setSubmitting(false);
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <Skeleton className="h-24 w-24 rounded-full mx-auto" />
      <Skeleton className="h-8 w-64 mx-auto" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
  if (!gig) return <div className="text-center py-20 text-slate-400">Gig not found.</div>;

  const tags = Array.isArray(gig.tags) ? gig.tags : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-12 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} />Back
      </button>

      {/* Freelancer Hero */}
      <div className="text-center space-y-4">
        <div className="inline-block p-1 bg-brand-purple/20 rounded-full">
          <div className="w-24 h-24 rounded-full overflow-hidden glass border-4 border-white/10">
            {profile?.profile_image ? (
              <img src={profile.profile_image} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5 text-slate-500"><User size={40} /></div>
            )}
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold">{profile?.name}</h1>
          <p className="text-slate-400 mt-1 max-w-md mx-auto">{profile?.bio}</p>
        </div>
      </div>

      {/* Gig Card */}
      <Card className="p-8 space-y-8 relative overflow-hidden">
        {gig.status === 'paused' && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-10 flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl shadow-2xl space-y-4 max-w-sm text-center">
              <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto"><Clock size={32} /></div>
              <h3 className="text-xl font-bold">Currently Paused</h3>
              <p className="text-slate-400 text-sm">Not accepting orders for this service right now.</p>
              <Button onClick={() => navigate('/')} variant="secondary" className="w-full">Go to Dashboard</Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 min-w-0">
              <h2 className="text-2xl font-bold">{gig.service_name}</h2>
              {gig.avg_rating != null && (
                <div className="flex items-center gap-2 text-amber-400">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < Math.round(gig.avg_rating!) ? 'currentColor' : 'none'} className={i < Math.round(gig.avg_rating!) ? 'text-amber-400' : 'text-slate-600'} />)}
                  </div>
                  <span className="text-sm font-bold">{gig.avg_rating.toFixed(1)}</span>
                  <span className="text-xs text-slate-500">({gig.review_count} reviews)</span>
                </div>
              )}
              {tags.length > 0 && <div className="flex flex-wrap gap-1">{tags.map(t => <TagBadge key={t} tag={t} />)}</div>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-mono font-bold text-emerald-400">${gig.price}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest">Fixed Price</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed">{gig.description}</p>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-400 border-y border-white/10 py-4">
          <div className="flex items-center gap-2"><Clock size={18} className="text-brand-purple" />Delivery: {gig.delivery_time}</div>
          <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-brand-purple" />Professional Quality</div>
        </div>

        <AnimatePresence mode="wait">
          {hired ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-6 text-center space-y-3">
              <CheckCircle2 className="mx-auto text-emerald-400" size={32} />
              <h3 className="text-xl font-bold text-emerald-400">Request Sent!</h3>
              <p className="text-emerald-200/70 text-sm">The freelancer has been notified. They'll decide whether to accept.</p>
              <div className="flex gap-3 mt-4">
                <Button onClick={() => setHired(false)} variant="secondary" className="flex-1">Request Again</Button>
                <Button onClick={() => navigate('/')} variant="ghost" className="flex-1">Dashboard</Button>
              </div>
            </motion.div>
          ) : (
            <motion.div exit={{ opacity: 0 }}>
              <motion.div animate={mode === 'employer' ? { boxShadow: ['0 0 0 0 rgba(109,40,217,0)', '0 0 20px 4px rgba(109,40,217,0.3)', '0 0 0 0 rgba(109,40,217,0)'] } : {}}
                transition={{ duration: 2, repeat: Infinity }} className="rounded-xl">
                <Button onClick={handleHire} disabled={mode === 'freelancer' || submitting}
                  className={cn('w-full py-5 text-xl', mode === 'freelancer' && 'opacity-50 cursor-not-allowed grayscale')}>
                  {submitting ? 'Sending...' : mode === 'freelancer' ? 'Switch to Employer to Hire' : hired ? 'Renew Contract' : 'Request Contract'}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Reviews */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2"><Star size={20} className="text-amber-400" />Client Reviews</h3>
        <ReviewsList gigId={id!} />
      </div>

      {/* Client name modal */}
      <Modal isOpen={showClientModal} onClose={() => setShowClientModal(false)} title="Your Name">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm text-slate-400">Your Name / Company</label>
            <input required placeholder="e.g. Acme Corp" value={clientName} onChange={e => setClientName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && clientName && handleHire()}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-brand-purple transition-colors" />
          </div>
          <Button className="w-full" onClick={handleHire} disabled={!clientName || submitting}>
            {submitting ? 'Sending...' : 'Submit Request'}
          </Button>
        </div>
      </Modal>

      <footer className="text-center"><p className="text-slate-500 text-sm">Powered by HustleOS</p></footer>
    </motion.div>
  );
};

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState<'freelancer'|'employer'>('freelancer');
  const [theme, setTheme] = useState<'dark'|'light'>('dark');

  useEffect(() => {
    // Load saved theme from profile
    fetch('/api/profile').then(r => r.json()).then(p => { if (p.theme) setTheme(p.theme); });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: next }) });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle: toggleTheme }}>
      <BrowserRouter>
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <Routes>
            <Route path="/" element={<Dashboard mode={mode} setMode={setMode} />} />
            <Route path="/create" element={<GigCreator />} />
            <Route path="/portal/:id" element={<Portal mode={mode} />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </div>

        {/* Mobile Nav */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass rounded-2xl p-2 flex gap-1 z-50 md:hidden border border-white/10">
          <Link to="/" className="p-3 hover:bg-white/10 rounded-xl transition-colors"><LayoutDashboard size={22} /></Link>
          <Link to="/create" className="p-3 bg-brand-purple rounded-xl text-white shadow-lg shadow-brand-purple/40"><PlusCircle size={22} /></Link>
          <Link to="/analytics" className="p-3 hover:bg-white/10 rounded-xl transition-colors"><BarChart2 size={22} /></Link>
        </nav>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
