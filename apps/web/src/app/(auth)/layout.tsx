export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 text-lg font-semibold">Ride Platform</div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
