import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function SignDocument() {
    const { requestId } = useParams();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [signatureType, setSignatureType] = useState('DRAWN');
    const [uploadedSignature, setUploadedSignature] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const sigCanvas = useRef(null);

    useEffect(() => {
        fetchRequest();
    }, [requestId]);

    const fetchRequest = async () => {
        try {
            const response = await axios.get(`/api/sign-requests/${requestId}`);
            setRequest(response.data);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load request');
            setLoading(false);
        }
    };

    const clearSignature = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    const handleSignatureUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadedSignature(file);
        }
    };

    const handleSubmitSignature = async () => {
        setError(null);
        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('signatureType', signatureType);

            if (signatureType === 'DRAWN') {
                if (sigCanvas.current.isEmpty()) {
                    setError('Please provide a signature');
                    setSubmitting(false);
                    return;
                }
                const dataUrl = sigCanvas.current.toDataURL();
                formData.append('signatureData', dataUrl);
            } else {
                if (!uploadedSignature) {
                    setError('Please upload a signature image');
                    setSubmitting(false);
                    return;
                }
                formData.append('signatureImage', uploadedSignature);
            }

            await axios.post(`/api/signatures/${requestId}/sign`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit signature');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setError('Please provide a reason for rejection');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await axios.post(`/api/signatures/${requestId}/reject`, {
                reason: rejectionReason,
            });
            setSuccess(true);
            setShowRejectModal(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reject document');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (error && !request) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
                    <div className="text-red-700 text-xl mb-4">⚠️ {error}</div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center max-w-md">
                    <div className="text-green-700 text-2xl mb-4">✓ Document Processed</div>
                    <p className="text-gray-700">
                        {request.status === 'REJECTED'
                            ? 'You have rejected this document.'
                            : 'Successfully signed! The staff will be notified.'}
                    </p>
                </div>
            </div>
        );
    }

    if (request.status !== 'PENDING') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center max-w-md">
                    <div className="text-yellow-700 text-xl mb-4">Document Already Processed</div>
                    <p className="text-gray-700">Status: {request.status}</p>
                </div>
            </div>
        );
    }

    const signAreasOnCurrentPage = request.signAreaCoords.filter(area => area.page === currentPage);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Sign Document</h1>
                    <p className="text-lg text-gray-600">Request from: {request.staffName}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel - PDF Preview */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold mb-4">Document to Sign</h2>

                        <div className="mb-4 flex items-center justify-between">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                            >
                                ← Previous
                            </button>
                            <span className="text-sm font-medium">
                                Page {currentPage} of {numPages || '?'}
                            </span>
                            <button
                                onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                                disabled={currentPage === numPages}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                            >
                                Next →
                            </button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <div className="relative">
                                <Document file={request.pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                                    <Page pageNumber={currentPage} width={500} />
                                </Document>

                                {signAreasOnCurrentPage.map((area, index) => (
                                    <div
                                        key={index}
                                        className="absolute border-4 border-red-500 bg-red-100 bg-opacity-30"
                                        style={{
                                            left: `${area.x}px`,
                                            top: `${area.y}px`,
                                            width: `${area.width}px`,
                                            height: `${area.height}px`,
                                        }}
                                    >
                                        <div className="text-red-700 text-xs font-bold p-1">SIGN HERE</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>{request.signAreaCoords.length}</strong> signature area(s) marked across {numPages} page(s).
                                Your signature will be placed on all marked areas.
                            </p>
                        </div>
                    </div>

                    {/* Right Panel - Signature */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold mb-6">Your Signature</h2>

                        <div className="mb-6">
                            <div className="flex gap-4 mb-4">
                                <button
                                    onClick={() => setSignatureType('DRAWN')}
                                    className={`flex-1 py-3 rounded-lg font-medium transition ${signatureType === 'DRAWN'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    ✏️ Draw
                                </button>
                                <button
                                    onClick={() => setSignatureType('UPLOADED')}
                                    className={`flex-1 py-3 rounded-lg font-medium transition ${signatureType === 'UPLOADED'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    📸 Upload
                                </button>
                            </div>

                            {signatureType === 'DRAWN' ? (
                                <div>
                                    <div className="border-2 border-gray-300 rounded-lg bg-white">
                                        <SignatureCanvas
                                            ref={sigCanvas}
                                            canvasProps={{
                                                width: 500,
                                                height: 200,
                                                className: 'w-full h-48',
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={clearSignature}
                                        className="mt-2 text-sm text-red-600 hover:underline"
                                    >
                                        Clear signature
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg"
                                        onChange={handleSignatureUpload}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    />
                                    {uploadedSignature && (
                                        <div className="mt-4">
                                            <img
                                                src={URL.createObjectURL(uploadedSignature)}
                                                alt="Signature preview"
                                                className="max-w-full h-48 object-contain border rounded-lg"
                                            />
                                            <p className="text-sm text-gray-600 mt-2">
                                                Background will be automatically removed
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleSubmitSignature}
                                disabled={submitting}
                                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 text-lg font-semibold"
                            >
                                {submitting ? 'Signing...' : '✓ Sign Document'}
                            </button>

                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={submitting}
                                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
                            >
                                ✕ Reject Document
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold mb-4">Reject Document</h2>
                        <p className="text-gray-600 mb-4">Please provide a reason for rejecting this document:</p>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none mb-4"
                            placeholder="Enter reason..."
                        />

                        <div className="flex gap-4">
                            <button
                                onClick={handleReject}
                                disabled={submitting}
                                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
                            >
                                {submitting ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
