// Trust ledger (public) — status, balance, rules in plain language, guardians by circle, request timeline (W-7.3)
export default async function TrustPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <h1>Trust #{id}</h1>
      <p>Not implemented yet (W-7.3).</p>
    </main>
  );
}
