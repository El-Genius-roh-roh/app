/** Recréé à chaque navigation : sert à animer l'arrivée de chaque page (voir .entree-page dans globals.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="entree-page">{children}</div>;
}
