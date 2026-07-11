import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Upload, FileSpreadsheet, Trash2, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => api.get("/datasets").then(r => setDatasets(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const onDrop = useCallback(async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      await api.post("/datasets/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Uploaded ${files[0].name}`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally { setUploading(false); }
  }, [load]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"], "application/json": [".json"], "application/octet-stream": [".parquet"] },
  });

  const remove = async (id) => {
    if (!window.confirm("Delete this dataset?")) return;
    await api.delete(`/datasets/${id}`); toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="label-eyebrow">datasets</div>
        <h1 className="font-display text-4xl tracking-tighter mt-2">Bring your data.</h1>
        <p className="text-neutral-500 mt-2">CSV, Excel, JSON, or Parquet · up to 50MB.</p>
      </div>

      <div {...getRootProps()} data-testid="dropzone"
        className={`card-surface border-dashed cursor-pointer p-12 text-center transition-colors ${isDragActive ? "border-indigo-500/70 bg-indigo-500/[0.04]" : ""}`}>
        <input {...getInputProps()} data-testid="dropzone-input"/>
        {uploading ? (
          <div className="inline-flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400"/> Uploading & parsing…
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-indigo-400 mx-auto" strokeWidth={1.5}/>
            <div className="mt-4 font-display text-xl tracking-tight">Drop a file here</div>
            <div className="mt-1 text-sm text-neutral-500">or click to browse — .csv, .xlsx, .json, .parquet</div>
          </>
        )}
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-xl tracking-tight mb-4">Your datasets</h2>
        {datasets.length === 0 ? (
          <div className="text-sm text-neutral-500 py-6">Nothing here yet.</div>
        ) : (
          <div className="overflow-hidden rounded-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-mono text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 pl-3">Name</th>
                  <th className="py-3">Rows</th>
                  <th className="py-3">Cols</th>
                  <th className="py-3">Size</th>
                  <th className="py-3">Uploaded</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {datasets.map(d => (
                  <tr key={d.dataset_id} className="border-t border-white/[0.06] hover:bg-white/[0.02] transition-colors" data-testid={`dataset-row-${d.dataset_id}`}>
                    <td className="py-3 pl-3">
                      <Link to={`/app/datasets/${d.dataset_id}`} className="inline-flex items-center gap-2 hover:text-indigo-300 transition-colors">
                        <FileSpreadsheet className="h-4 w-4 text-neutral-500"/> {d.name}
                      </Link>
                    </td>
                    <td className="py-3 font-mono text-neutral-300">{d.rows?.toLocaleString()}</td>
                    <td className="py-3 font-mono text-neutral-300">{d.cols}</td>
                    <td className="py-3 font-mono text-neutral-500">{Math.round((d.size_bytes||0)/1024)} KB</td>
                    <td className="py-3 font-mono text-neutral-500 text-xs">{new Date(d.created_at).toLocaleString()}</td>
                    <td className="py-3 pr-3 text-right">
                      <Link to={`/app/datasets/${d.dataset_id}`} className="inline-block text-neutral-500 hover:text-white p-1.5 rounded-md hover:bg-white/[0.05] transition-colors">
                        <ArrowUpRight className="h-4 w-4"/>
                      </Link>
                      <button onClick={()=>remove(d.dataset_id)} data-testid={`delete-${d.dataset_id}`}
                        className="text-neutral-500 hover:text-red-400 p-1.5 rounded-md hover:bg-white/[0.05] transition-colors">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
