"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button onClick={logout} className="text-[15px] text-[var(--color-text)]/50 hover:text-[var(--color-accent)]">
      Log out
    </button>
  );
}
