import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listCategories, type MedusaCategory } from "@/lib/medusa";

export default async function CountryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let categories: MedusaCategory[] = [];
  try {
    categories = await listCategories();
  } catch {
    // The page remains readable when Medusa is temporarily unavailable.
  }

  return (
    <>
      <SiteHeader categories={categories} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
