import { ExternalLink as ExternalLinkIcon } from 'lucide-react';

interface ExtLinkProps {
  href: string;
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

/**
 * Opens links in the user's default browser via Electron's shell.openExternal.
 * Use this instead of <a target="_blank">, that does not work properly in Electron.
 */
export function ExtLink({ href, children, showIcon = false, className = '' }: ExtLinkProps) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    window.api.shell.openExternal(href);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`text-brand dark:text-brand-light hover:underline inline-flex items-center gap-1 cursor-pointer ${className}`}
    >
      {children}
      {showIcon && <ExternalLinkIcon size={10} />}
    </a>
  );
}
