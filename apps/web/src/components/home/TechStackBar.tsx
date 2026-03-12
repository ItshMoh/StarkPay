export default function TechStackBar() {
  return (
    <section className="py-12 px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] flex flex-col items-center justify-center">
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-neutral-400 mb-4">Built on</p>
      <div className="flex items-center gap-2 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300 cursor-default">
        <div className="text-3xl font-bold font-serif tracking-tight">Starknet</div>
      </div>
    </section>
  );
}
