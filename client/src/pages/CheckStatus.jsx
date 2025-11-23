import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function CheckStatus() {
    const { requestId } = useParams();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [requestId]);

    const fetchStatus = async () => {
        try {
            const response = await axios.get(`/api/signatures/${requestId}/status`);
            setStatus(response.data);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch status');
            setLoading(false);
        }
    };

    const handleDownload = () => {
        window.open(`/api/signatures/${requestId}/download`, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-xl">Loading status...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
                    <div className="text-red-700 text-xl mb-4">⚠️ {error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">TapSign</h1>
                    <p className="text-lg text-gray-600">Document Signature Status</p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="mb-6">
                        <div className="text-sm text-gray-600 mb-2">Staff Name</div>
                        <div className="text-xl font-semibold">{status.staffName}</div>
                    </div>

                    <div className="mb-6">
                        <div className="text-sm text-gray-600 mb-2">Boss</div>
                        <div className="text-xl font-semibold">{status.bossName}</div>
                    </div>

                    <div className="mb-6">
                        <div className="text-sm text-gray-600 mb-2">Created</div>
                        <div className="text-lg">{new Date(status.createdAt).toLocaleString()}</div>
                    </div>

                    <div className="border-t pt-6">
                        {status.status === 'PENDING' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                                <div className="text-yellow-700 text-2xl mb-2">⏳ Pending</div>
                                <p className="text-gray-700">Waiting for boss to sign the document</p>
                                <p className="text-sm text-gray-500 mt-2">This page will auto-refresh</p>
                            </div>
                        )}

                        {status.status === 'SIGNED' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                                <div className="text-green-700 text-3xl mb-4">✓ Document Signed!</div>
                                <p className="text-gray-700 mb-4">Signed on: {new Date(status.signedAt).toLocaleString()}</p>

                                <button
                                    onClick={handleDownload}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-lg font-semibold"
                                >
                                    📥 Download Signed PDF
                                </button>
                            </div>
                        )}

                        {status.status === 'REJECTED' && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                <div className="text-red-700 text-3xl mb-4 text-center">✕ Document Rejected</div>
                                <div className="bg-white p-4 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-2">Rejection Reason:</div>
                                    <div className="text-gray-900">{status.rejectionReason}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
