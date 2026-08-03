// Couleurs des trois issues 1 / N / 2, partagées par tous les endroits qui
// affichent un bouton de prono.
//
// Cette constante était dupliquée dans PronoBtn.jsx et DcBtn.jsx, et
// simplement absente de Pronos.jsx qui l'utilisait pourtant à l'étape 3 du
// missile : le composant plantait sur un ReferenceError dès que le joueur
// arrivait au choix du prono à imposer.
export const RESULT_COLORS = {
  1: { sel: 'var(--b)', dim: 'var(--b-dim)', label: '1' },
  N: { sel: 'var(--a)', dim: 'var(--a-dim)', label: 'N' },
  2: { sel: 'var(--p)', dim: 'var(--p-dim)', label: '2' },
};

export default RESULT_COLORS;
