export default function Loading() {
  return (
    <main className="mx-auto max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6">
      <div className="h-10 w-72 animate-pulse rounded-lg bg-[#dcdde3]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg bg-white shadow-[0_18px_45px_rgba(25,37,55,0.07)]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-96 animate-pulse rounded-lg bg-white shadow-[0_18px_45px_rgba(25,37,55,0.07)]" />
        ))}
      </div>
    </main>
  );
}
