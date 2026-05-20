export function getDrugLabel(drug) {
  if (!drug) return "";

  if (typeof drug === "string") {
    const value = drug.trim();
    return /^\d+$/.test(value) ? "" : value;
  }

  return (
    drug.display_name ||
    drug.full_name ||
    drug.drug_display_name ||
    drug.drug_full_name ||
    drug.drug_name ||
    drug.name ||
    ""
  );
}
