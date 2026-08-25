/**
 * Public landing pages layout — strips the dark theme so the page
 * renders as a standard white background for published landing pages.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
