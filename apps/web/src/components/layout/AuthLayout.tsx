import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">S</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">The Soothsayer</h1>
          <p className="mt-2 text-muted-foreground">Enterprise AI Workspace Platform</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-8 shadow-xl">
          <Outlet />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
