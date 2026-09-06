import Link from "next/link";
import LogoutButton from "./LogoutButton";

export interface HeaderMeta {
  left: string;
  center: string;
  right: string;
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={active ? "text-[15px] text-[var(--color-accent)]" : "text-[15px] text-[var(--color-text)] hover:text-[var(--color-accent)]"}
    >
      {children}
    </Link>
  );
}

export default function Header({ active, meta }: { active?: "home" | "rooms"; meta: HeaderMeta }) {
  return (
    <header className="px-6 py-4 border-b border-[var(--color-divider)]">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <Link href="/" className="font-heading font-semibold text-xl tracking-tight">
          Symposium
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink href="/" active={active === "home"}>
            New Debate
          </NavLink>
          <NavLink href="/rooms" active={active === "rooms"}>
            Rooms
          </NavLink>
          <LogoutButton />
        </nav>
      </div>
      {(meta.left || meta.center || meta.right) && (
        <div className="mx-auto flex w-full max-w-4xl justify-between pt-4 text-[10px] tracking-[0.2em] uppercase text-[var(--color-text)]/40 font-medium">
          <span>{meta.left}</span>
          <span className="text-[var(--color-accent-2)]">{meta.center}</span>
          <span>{meta.right}</span>
        </div>
      )}
    </header>
  );
}
