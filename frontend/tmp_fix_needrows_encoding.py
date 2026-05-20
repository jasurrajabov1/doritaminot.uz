from pathlib import Path

path = Path("src/pages/NeedRowsPage.jsx")
text = path.read_text(encoding="utf-8-sig")

markers = ("?", "??", "??", "??", "??", "??", "??")

if any(marker in text for marker in markers):
    try:
        fixed = text.encode("cp1251").decode("utf-8")
    except UnicodeError:
        fixed_lines = []

        for line in text.splitlines(True):
            try:
                fixed_lines.append(line.encode("cp1251").decode("utf-8"))
            except UnicodeError:
                fixed_lines.append(line)

        fixed = "".join(fixed_lines)

    path.write_text(fixed, encoding="utf-8")
    print("NeedRowsPage encoding restored")
else:
    print("No mojibake markers found")
