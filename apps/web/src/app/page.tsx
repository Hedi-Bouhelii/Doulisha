/**
 * Placeholder home page for Phase 0, in the default locale (French).
 * The real, translated home page is built in Phase 2 (DSC-02).
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-brand text-4xl font-bold">Doulisha</h1>
      <p className="text-lg">
        Découvrez quoi faire en Tunisie, organisez n’importe quel événement et invitez vos amis :
        randonnées, concerts, ateliers, anniversaires et bien plus.
      </p>
      <p className="text-accent text-sm font-medium">Bientôt disponible.</p>
    </main>
  );
}
