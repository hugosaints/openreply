/** Layout that renders its children untouched; used to attach metadata to a segment. */
export default function PassthroughLayout({ children }: { children: React.ReactNode }) {
  return children;
}
