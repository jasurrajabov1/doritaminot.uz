from pathlib import Path

path = Path("src/pages/NeedRowsSummaryPage.jsx")
text = path.read_text(encoding="utf-8-sig")

old = '''const renderColumnChooser = ({
  title,
  columns,
  groups,
  visibleKeys,
  onChange,
  storageKey,
  compactCountLabel,
}) => {'''

new = '''const renderColumnChooser = ({
  title,
  columns,
  groups,
  visibleKeys,
  onChange,
  storageKey,
  compactCountLabel,
  isOpen,
  onToggle,
}) => {'''

if old not in text:
    raise SystemExit("renderColumnChooser параметрлари топилмади.")

text = text.replace(old, new, 1)


old = '''          <button type="button" disabled>
            {compactCountLabel} ({visibleKeys.length} / {columns.length})
          </button>'''

new = '''          <button type="button" onClick={onToggle}>
            {isOpen ? "Устунларни яшириш" : compactCountLabel} ({visibleKeys.length} / {columns.length})
          </button>'''

if old not in text:
    raise SystemExit("Устунлар count button топилмади.")

text = text.replace(old, new, 1)


old = '''      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "10px",
          marginTop: "12px",
        }}
      >
        {groups.map((group) => (
          <div
            key={group.title}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "10px",
              background: "#ffffff",
            }}
          >
            <strong>{group.title}</strong>
            <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
              {group.columns.map((column) => (
                <label
                  key={column.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: column.required ? "#64748b" : "#0f172a",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleSet.has(column.key)}
                    disabled={column.required}
                    onChange={() => toggleKey(column.key)}
                  />
                  {column.label}
                  {column.required ? " (мажбурий)" : ""}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>'''

new = '''      {isOpen ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "10px",
            marginTop: "12px",
          }}
        >
          {groups.map((group) => (
            <div
              key={group.title}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "10px",
                background: "#ffffff",
              }}
            >
              <strong>{group.title}</strong>
              <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                {group.columns.map((column) => (
                  <label
                    key={column.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: column.required ? "#64748b" : "#0f172a",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleSet.has(column.key)}
                      disabled={column.required}
                      onChange={() => toggleKey(column.key)}
                    />
                    {column.label}
                    {column.required ? " (мажбурий)" : ""}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}'''

if old not in text:
    raise SystemExit("Чекбокслар grid блоки топилмади.")

text = text.replace(old, new, 1)


old = '''  const [visibleDrugColumns, setVisibleDrugColumns] = useState(() =>
    readVisibleColumns("need_rows_summary_drug_columns_v1", DRUG_TOTAL_COLUMNS, "standard")
  );'''

new = '''  const [visibleDrugColumns, setVisibleDrugColumns] = useState(() =>
    readVisibleColumns("need_rows_summary_drug_columns_v1", DRUG_TOTAL_COLUMNS, "standard")
  );

  const [isDetailColumnChooserOpen, setIsDetailColumnChooserOpen] = useState(false);
  const [isDrugColumnChooserOpen, setIsDrugColumnChooserOpen] = useState(false);'''

if old not in text:
    raise SystemExit("visibleDrugColumns state блоки топилмади.")

text = text.replace(old, new, 1)


old = '''        storageKey: "need_rows_summary_detail_columns_v1",
        compactCountLabel: "Устунлар",
      })}'''

new = '''        storageKey: "need_rows_summary_detail_columns_v1",
        compactCountLabel: "Устунлар",
        isOpen: isDetailColumnChooserOpen,
        onToggle: () => setIsDetailColumnChooserOpen((value) => !value),
      })}'''

if old not in text:
    raise SystemExit("Detail renderColumnChooser параметрлари топилмади.")

text = text.replace(old, new, 1)


old = '''        storageKey: "need_rows_summary_drug_columns_v1",
        compactCountLabel: "Устунлар",
      })}'''

new = '''        storageKey: "need_rows_summary_drug_columns_v1",
        compactCountLabel: "Устунлар",
        isOpen: isDrugColumnChooserOpen,
        onToggle: () => setIsDrugColumnChooserOpen((value) => !value),
      })}'''

if old not in text:
    raise SystemExit("Drug renderColumnChooser параметрлари топилмади.")

text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("NeedRowsSummaryPage column panels collapsed by default")
