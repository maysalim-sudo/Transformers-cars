/** How far a callout's card sits from its dot (Tailwind start-14), and the margin it keeps from the screen edge. */
const OFFSET = 56;
const MARGIN = 8;

/**
 * Where a callout's card goes so it stays on screen. It normally reaches toward the end side (right, or left on
 * right-to-left pages); if it does not fit there it goes on the other side of the dot; if it fits neither (a
 * narrow phone, a dot mid-screen), it takes the roomier side and `shift`s (px, + = right) just enough to stay on.
 */
export function calloutPlace({ x, card, view, rtl }: { x: number; card: number; view: number; rtl: boolean }): { flip: boolean; shift: number } {
  const rightRoom = view - MARGIN - (x + OFFSET); // room for a card reaching right of the dot
  const leftRoom = x - OFFSET - MARGIN; // … reaching left
  const [usual, other] = rtl ? [leftRoom, rightRoom] : [rightRoom, leftRoom];
  if (usual >= card) return { flip: false, shift: 0 };
  if (other >= card) return { flip: true, shift: 0 };
  const flip = other > usual;
  const goesRight = rtl === flip;
  const shortBy = card - (flip ? other : usual);
  return { flip, shift: goesRight ? -shortBy : shortBy };
}
