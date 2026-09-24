'use client';

import { authClient } from '@doulisha/auth/client';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { initials } from '@/components/doulisha/friends-going';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useRouter } from '@/i18n/navigation';

export interface MenuUser {
  name: string;
  image: string | null;
  isAdmin: boolean;
}

/** Avatar menu for signed-in members; guests and visitors see "Sign in". */
export function UserMenu({ user }: { user: MenuUser | null }) {
  const t = useTranslations('Nav');
  const router = useRouter();

  if (!user) {
    return (
      <Button asChild className="min-h-11 rounded-full px-4 text-sm sm:px-5">
        <Link href="/sign-in">{t('signIn')}</Link>
      </Button>
    );
  }

  async function signOut() {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-full"
          aria-label={t('account')}
          data-testid="user-menu"
        >
          <Avatar className="size-9">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.isAdmin ? (
          <DropdownMenuItem asChild className="min-h-11">
            <Link href="/admin">
              <LayoutDashboard />
              {t('admin')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => void signOut()} className="min-h-11">
          <LogOut className="rtl:-scale-x-100" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
