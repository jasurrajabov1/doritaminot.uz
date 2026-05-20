from pathlib import Path

path = Path("src/pages/NeedRowsPage.jsx")
text = path.read_text(encoding="utf-8")

text = text.replace(
'''  const compactHeaderCell = {
    padding: "6px 6px",
    fontSize: "12px",
    lineHeight: "1.15",
    verticalAlign: "top",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    textAlign: "left",
  };

  const compactCell = {
    padding: "5px 6px",
    fontSize: "12px",
    verticalAlign: "top",
    lineHeight: "1.15",
  };

  const wrapCell = {
    ...compactCell,
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  };

  const nowrapCell = {
    ...compactCell,
    whiteSpace: "nowrap",
  };
''',
'''  const compactHeaderCell = {
    padding: "6px 6px",
    fontSize: "12px",
    lineHeight: "1.15",
    verticalAlign: "top",
    whiteSpace: "normal",
    wordBreak: "normal",
    overflowWrap: "break-word",
    textAlign: "left",
    minWidth: "90px",
  };

  const compactCell = {
    padding: "5px 6px",
    fontSize: "12px",
    verticalAlign: "top",
    lineHeight: "1.15",
    minWidth: "90px",
  };

  const wrapCell = {
    ...compactCell,
    whiteSpace: "normal",
    wordBreak: "normal",
    overflowWrap: "break-word",
    minWidth: "150px",
    maxWidth: "260px",
  };

  const nowrapCell = {
    ...compactCell,
    whiteSpace: "nowrap",
  };
'''
)

text = text.replace(
'''  const actionButtonStyle = {
    padding: "6px 10px",
    fontSize: "12px",
    lineHeight: "1.1",
    borderRadius: "8px",
  };
''',
'''  const actionButtonStyle = {
    padding: "6px 10px",
    fontSize: "12px",
    lineHeight: "1.1",
    borderRadius: "8px",
  };

  const needRowsTableStyle = {
    width: "max-content",
    minWidth: "2700px",
    tableLayout: "auto",
  };

  const historyTableStyle = {
    width: "max-content",
    minWidth: "1650px",
    tableLayout: "auto",
  };
'''
)

text = text.replace(
'''  useEffect(() => {
    load();
  }, []);
''',
'''  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'''
)

text = text.replace(
'''      <div className="table-wrap">
        <table className="grid-table" style={{ width: "100%", tableLayout: "auto" }}>
''',
'''      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table className="grid-table" style={needRowsTableStyle}>
'''
)

text = text.replace(
'''      <div id="need-additions-history" className="table-wrap" style={{ marginTop: "16px" }}>
''',
'''      <div id="need-additions-history" className="table-wrap" style={{ marginTop: "16px", overflowX: "auto" }}>
'''
)

text = text.replace(
'''        <table className="grid-table" style={{ width: "100%", tableLayout: "auto", marginTop: "10px" }}>
''',
'''        <table className="grid-table" style={{ ...historyTableStyle, marginTop: "10px" }}>
'''
)

path.write_text(text, encoding="utf-8")
print("NeedRowsPage stage4 fix1 applied")
