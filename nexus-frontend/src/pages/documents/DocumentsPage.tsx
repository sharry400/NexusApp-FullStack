import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Upload, Download, Trash2, Share2, Eye, PenLine, X,
  File, FileImage, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000';

const getFileIcon = (mimeType: string) => {
  if (mimeType?.includes('image')) return <FileImage size={24} className="text-blue-500" />;
  if (mimeType?.includes('pdf')) return <FileText size={24} className="text-red-500" />;
  return <File size={24} className="text-primary-600" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getStatusColor = (status: string) => {
  if (status === 'signed') return 'success';
  if (status === 'final') return 'primary';
  return 'secondary';
};

export const DocumentsPage: React.FC = () => {
  const { token, user } = useAuth() as any;
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // E-Signature modal
  const [signingDoc, setSigningDoc] = useState<any | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [isSigning, setIsSigning] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/documents`, authHeaders);
      setDocuments(res.data);
    } catch (err) {
      console.error('Fetch documents error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchDocuments();
  }, [token, fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API}/api/documents/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded!');
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await axios.delete(`${API}/api/documents/${docId}`, authHeaders);
      toast.success('Document deleted');
      fetchDocuments();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDownload = (doc: any) => {
    const a = document.createElement('a');
    a.href = `${API}${doc.url}`;
    a.download = doc.originalName;
    a.target = '_blank';
    a.click();
  };

  // ─── Canvas Drawing ──────────────────────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => { isDrawingRef.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    if (!signingDoc) return;
    const canvas = canvasRef.current!;
    const signatureUrl = canvas.toDataURL('image/png');
    setIsSigning(true);
    try {
      await axios.put(`${API}/api/documents/${signingDoc._id}/sign`, { signatureUrl }, authHeaders);
      toast.success('Document signed successfully!');
      setSigningDoc(null);
      fetchDocuments();
    } catch {
      toast.error('Signing failed');
    } finally {
      setIsSigning(false);
    }
  };

  const totalSize = documents.reduce((sum, d) => sum + (d.size || 0), 0);
  const storageLimitBytes = 100 * 1024 * 1024; // 100MB display limit
  const storagePercent = Math.min((totalSize / storageLimitBytes) * 100, 100).toFixed(0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage, share and sign your important files</p>
        </div>
        <div>
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleUpload} />
          <Button
            leftIcon={uploading ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Storage</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium text-gray-900">{formatSize(totalSize)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-2 bg-primary-600 rounded-full transition-all" style={{ width: `${storagePercent}%` }} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{documents.length} files</span>
                <span className="font-medium text-gray-900">{storagePercent}% used</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Draft</span>
                  <span>{documents.filter(d => d.status === 'draft').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Final</span>
                  <span>{documents.filter(d => d.status === 'final').length}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Signed</span>
                  <span>{documents.filter(d => d.status === 'signed').length}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Main content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
              <Badge variant="secondary" size="sm">{documents.length} files</Badge>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-16">
                  <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-gray-500 font-medium">No documents yet</h3>
                  <p className="text-gray-400 text-sm mt-1">Upload your first document to get started</p>
                  <Button className="mt-4" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Upload Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div
                      key={doc._id}
                      className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200 border border-transparent hover:border-gray-200"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg mr-4 flex-shrink-0">
                        {getFileIcon(doc.mimeType)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</h3>
                          <Badge variant={getStatusColor(doc.status) as any} size="sm">
                            {doc.status}
                          </Badge>
                          {doc.uploadedBy?.name !== user?.name && (
                            <Badge variant="secondary" size="sm">Shared</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{formatSize(doc.size)}</span>
                          <span>By {doc.uploadedBy?.name || 'You'}</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          {doc.signatureUrl && <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} />Signed</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                        {!doc.signatureUrl && (
                          <button
                            onClick={() => setSigningDoc(doc)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                            title="Sign Document"
                          >
                            <PenLine size={18} />
                          </button>
                        )}
                        {doc.uploadedBy?._id === user?.id && (
                          <button
                            onClick={() => handleDelete(doc._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ─── Preview Modal ──────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-semibold text-gray-900 truncate">{previewDoc.originalName}</h2>
              <button onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-gray-700">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {previewDoc.mimeType?.includes('image') ? (
                <img src={`${API}${previewDoc.url}`} alt={previewDoc.originalName} className="max-w-full mx-auto rounded" />
              ) : previewDoc.mimeType?.includes('pdf') ? (
                <iframe src={`${API}${previewDoc.url}`} className="w-full h-full min-h-[60vh] rounded" title="PDF Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <FileText size={48} className="mb-3" />
                  <p className="text-sm">Preview not available for this file type</p>
                  <Button className="mt-4" size="sm" onClick={() => handleDownload(previewDoc)}>Download to View</Button>
                </div>
              )}
            </div>
            {previewDoc.signatureUrl && (
              <div className="p-4 border-t bg-green-50">
                <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                  <CheckCircle size={16} /> Document is signed
                </p>
                <img src={previewDoc.signatureUrl} alt="Signature" className="mt-2 h-12 border border-green-200 rounded bg-white p-1" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── E-Signature Modal ─────────────────────────────────────────── */}
      {signingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-900">Sign Document</h2>
                <p className="text-xs text-gray-500 mt-0.5">{signingDoc.originalName}</p>
              </div>
              <button onClick={() => { setSigningDoc(null); clearCanvas(); }} className="text-gray-400 hover:text-gray-700">
                <X size={22} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Draw your signature below:</p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    className="w-full cursor-crosshair block touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Draw your signature in the box above</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={clearCanvas}>Clear</Button>
                <Button
                  className="flex-1"
                  onClick={saveSignature}
                  isLoading={isSigning}
                  leftIcon={<PenLine size={16} />}
                >
                  Sign & Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};