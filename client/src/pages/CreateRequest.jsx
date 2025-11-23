import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import axios from 'axios';
import WhatsAppModal from '../components/WhatsAppModal';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function CreateRequest() {
    const [staffName, setStaffName] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [bosses, setBosses] = useState([]);
    const [selectedBoss, setSelectedBoss] = useState('');
    const [manualBossName, setManualBossName] = useState('');
    const [manualBossPhone, setManualBossPhone] = useState('');
    const [signAreas, setSignAreas] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [shareableLink, setShareableLink] = useState('');
    const [bossPhone, setBossPhone] = useState('');
    const pdfContainerRef = useRef(null);

    useEffect(() => {
        fetchBosses();
    }, []);

    const fetchBosses = async () => {
        try {
            const response = await axios.get('/api/bosses');
            setBosses(response.data);
        } catch (err) {
            console.error('Error fetching bosses:', err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setPdfUrl(URL.createObjectURL(file));
            setError(null);
            setSignAreas([]);
            setCurrentPage(1);
        } else {
            setError('Please select a valid PDF file');
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handleMouseDown = (e) => {
        if (!pdfContainerRef.current || isDrawing) return;

        const rect = pdfContainerRef.current.getBoundingClientRect();
        setDrawStart({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        setIsDrawing(true);
    };

    const handleMouseUp = (e) => {
        if (!isDrawing || !drawStart || !pdfContainerRef.current) return;

        const rect = pdfContainerRef.current.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const width = Math.abs(endX - drawStart.x);
        const height = Math.abs(endY - drawStart.y);

        if (width > 20 && height > 20) {
            const newArea = {
                page: currentPage,
                x: Math.min(drawStart.x, endX),
                y: Math.min(drawStart.y, endY),
                width,
                height,
            };
            setSignAreas([...signAreas, newArea]);
        }

        setIsDrawing(false);
        setDrawStart(null);
    };

    const removeSignArea = (index) => {
        setSignAreas(signAreas.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);

        if (!staffName.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!pdfFile) {
            setError('Please upload a PDF file');
            return;
        }

        if (signAreas.length === 0) {
            setError('Please mark at least one signature area');
            return;
        }

        if (!selectedBoss && (!manualBossName || !manualBossPhone)) {
            setError('Please select a boss or enter manual boss details');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('staffName', staffName);
            formData.append('pdf', pdfFile);
            formData.append('signAreaCoords', JSON.stringify(signAreas));

            if (selectedBoss) {
                formData.append('bossId', selectedBoss);
            } else {
                formData.append('manualBossName', manualBossName);
                formData.append('manualBossPhone', manualBossPhone);
            }

            const response = await axios.post('/api/sign-requests', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSuccess('Sign request created successfully!');
            setShareableLink(response.data.signRequest.shareableLink);
            setBossPhone(response.data.signRequest.bossPhone);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create sign request');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareableLink);
        alert('Link copied to clipboard!');
    };

    const signAreasOnCurrentPage = signAreas.filter(area => area.page === currentPage);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">TapSign</h1>
                    <p className="text-lg text-gray-600">Create a digital signature request</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {success && shareableLink ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                        <div className="text-green-700 text-xl font-semibold mb-4">✓ {success}</div>
                        <div className="bg-white p-4 rounded-lg mb-4 break-all">
                            <p className="text-sm text-gray-600 mb-2">Shareable Link:</p>
                            <p className="text-blue-600 font-mono">{shareableLink}</p>
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={copyToClipboard}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                📋 Copy Link
                            </button>
                            <button
                                onClick={() => setShowWhatsAppModal(true)}
                                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                📱 Send via WhatsApp
                            </button>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 text-blue-600 hover:underline"
                        >
                            Create another request
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Panel - Form */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-2xl font-semibold mb-6">Request Details</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Your Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={staffName}
                                        onChange={(e) => setStaffName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload PDF Document *
                                    </label>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Boss
                                    </label>
                                    <select
                                        value={selectedBoss}
                                        onChange={(e) => {
                                            setSelectedBoss(e.target.value);
                                            if (e.target.value) {
                                                setManualBossName('');
                                                setManualBossPhone('');
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select a boss --</option>
                                        {bosses.map((boss) => (
                                            <option key={boss.id} value={boss.id}>
                                                {boss.name} ({boss.phoneNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="text-center text-sm text-gray-500 my-2">OR enter manually</div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Boss Name
                                    </label>
                                    <input
                                        type="text"
                                        value={manualBossName}
                                        onChange={(e) => {
                                            setManualBossName(e.target.value);
                                            if (e.target.value) setSelectedBoss('');
                                        }}
                                        disabled={!!selectedBoss}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                        placeholder="Enter boss name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Boss Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={manualBossPhone}
                                        onChange={(e) => {
                                            setManualBossPhone(e.target.value);
                                            if (e.target.value) setSelectedBoss('');
                                        }}
                                        disabled={!!selectedBoss}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                        placeholder="+60123456789"
                                    />
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-blue-900 mb-2">Signature Areas Marked:</h3>
                                    {signAreas.length === 0 ? (
                                        <p className="text-sm text-blue-700">No areas marked yet. Draw on the PDF →</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {signAreas.map((area, index) => (
                                                <li key={index} className="flex justify-between items-center text-sm">
                                                    <span>Page {area.page} ({Math.round(area.width)}×{Math.round(area.height)}px)</span>
                                                    <button
                                                        onClick={() => removeSignArea(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        ✕
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 text-lg font-semibold"
                                >
                                    {loading ? 'Creating...' : 'Submit Request'}
                                </button>
                            </div>
                        </div>

                        {/* Right Panel - PDF Viewer */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-2xl font-semibold mb-4">Document Preview</h2>

                            {pdfFile ? (
                                <div>
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

                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50">
                                        <p className="text-sm text-gray-600 mb-2 text-center">
                                            Click and drag to mark "Sign Here" areas
                                        </p>
                                        <div
                                            ref={pdfContainerRef}
                                            className="relative cursor-crosshair"
                                            onMouseDown={handleMouseDown}
                                            onMouseUp={handleMouseUp}
                                        >
                                            <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                                                <Page pageNumber={currentPage} width={500} />
                                            </Document>

                                            {signAreasOnCurrentPage.map((area, index) => (
                                                <div
                                                    key={index}
                                                    className="absolute border-4 border-red-500 bg-red-100 bg-opacity-30 pointer-events-none"
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

                                            {isDrawing && drawStart && (
                                                <div
                                                    className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20"
                                                    style={{
                                                        left: `${drawStart.x}px`,
                                                        top: `${drawStart.y}px`,
                                                        width: '50px',
                                                        height: '30px',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
                                    Upload a PDF to preview and mark signature areas
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showWhatsAppModal && (
                <WhatsAppModal
                    shareableLink={shareableLink}
                    staffName={staffName}
                    bossPhone={bossPhone}
                    onClose={() => setShowWhatsAppModal(false)}
                />
            )}
        </div>
    );
}
