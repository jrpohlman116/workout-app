// The app's one route parser. Four tabs: Home, Today, Progress, More.
//
//   /                 Home
//   /today            Today (optional ?lift= picks the session)
//   /progress         Progress, default tab
//   /progress/:tab    Progress on a tab (?lift= picks a lift, &sheet=tm opens
//                     its training max sheet)
//   /more             More
//   /more/:page       A tool or settings page inside More (program, plates, ...)
//
// Old links keep working: /workout?lift=x goes to /today?lift=x, /calculator
// to More → 1RM estimator, /profile to More → Account, /home to /.

export type Tab = 'home' | 'today' | 'progress' | 'more';

export interface Route {
  tab: Tab;
  /** Progress tab or More page. */
  sub?: string;
  /** Today: the lift to open. Progress: the lift selected. */
  lift?: string;
  /** Progress only: a sheet to open on arrival. */
  sheet?: 'tm';
}

// Pages that moved inside More.
const LEGACY_MORE: Record<string, string> = { calculator: '1rm', profile: 'account' };

const clean = (segment: string | undefined) => (segment ? decodeURIComponent(segment).trim() || undefined : undefined);

export function parseRoute(pathname: string, search = ''): Route {
  const params = new URLSearchParams(search);
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const [first, second] = parts;
  const lift = clean(params.get('lift') ?? undefined);

  switch (first) {
    case undefined:
    case 'home':
      return { tab: 'home' };
    case 'today':
    case 'workout':
      return lift ? { tab: 'today', lift } : { tab: 'today' };
    case 'progress': {
      const route: Route = { tab: 'progress' };
      if (second) route.sub = clean(second);
      if (lift) route.lift = lift;
      if (params.get('sheet') === 'tm') route.sheet = 'tm';
      return route;
    }
    case 'more': {
      const sub = clean(second);
      return sub ? { tab: 'more', sub: LEGACY_MORE[sub] ?? sub } : { tab: 'more' };
    }
    case 'calculator':
    case 'profile':
      return { tab: 'more', sub: LEGACY_MORE[first] };
    default:
      return { tab: 'home' };
  }
}

/** The canonical path for a route. */
export function routeToPath(route: Route): string {
  switch (route.tab) {
    case 'home':
      return '/';
    case 'today':
      return route.lift ? `/today?lift=${encodeURIComponent(route.lift)}` : '/today';
    case 'progress': {
      const query = new URLSearchParams();
      if (route.lift) query.set('lift', route.lift);
      if (route.sheet) query.set('sheet', route.sheet);
      const q = query.toString();
      return `${route.sub ? `/progress/${encodeURIComponent(route.sub)}` : '/progress'}${q ? `?${q}` : ''}`;
    }
    case 'more':
      return route.sub ? `/${route.tab}/${encodeURIComponent(route.sub)}` : `/${route.tab}`;
  }
}

/** True when the URL isn't the canonical one for its route (an old link), so it should be replaced. */
export function isLegacyPath(pathname: string, search = ''): boolean {
  const route = parseRoute(pathname, search);
  return routeToPath(route) !== `${pathname.replace(/\/+$/, '') || '/'}${search}`;
}
