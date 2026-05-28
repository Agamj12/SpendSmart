import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { enrichTransactions } from '../utils/insights';

export default function UploadZone({ onData }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const enriched = enrichTransactions(results.data);
        onData(enriched);
        setLoading(false);
      },
    });
  };

  const loadSample = async () => {
    setLoading(true);
    const res = await fetch('/sample_transactions.csv');
    const text = await res.text();
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const enriched = enrichTransactions(results.data);
        onData(enriched);
        setLoading(false);
      },
    });
  };

  return (
    <div className="upload-zone-wrapper">
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current.click()}
      >
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={e => handleFile(e.target.files[0])} />
        <div className="upload-icon">📂</div>
        <h2>Drop your CSV here</h2>
        <p>or click to browse · columns: <code>date, description, amount</code></p>
        {loading && <div className="spinner" />}
      </div>
      <div className="upload-divider"><span>or</span></div>
      <button className="btn-sample" onClick={loadSample} disabled={loading}>
        ✨ Load Sample Data (demo)
      </button>
    </div>
  );
}
