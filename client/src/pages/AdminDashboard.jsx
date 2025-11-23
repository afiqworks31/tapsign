import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
    const [statistics, setStatistics] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const navigate = useNavigate();
    const { token, logout, user } = useAuth();

    useEffect(() => {
        fetchStatistics();
        fetchRequests();
    }, [statusFilter, searchQuery, page]);

    const fetchStatistics = async () => {
        try {
            const response = await axios.get('/api/admin/statistics', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStatistics(response.data);
        } catch (err) {
            console.error('Error fetching statistics:', err);
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/requests', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    status: statusFilter,
                    search: searchQuery,
                    page,
                    limit: 10,
                },
            });
            setRequests(response.data.requests);
            setPagination(response.data.pagination);
        } catch (err) {
            console.error('Error fetching requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            SIGNED: 'bg-green-100 text-green-800',
            REJECTED: 'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">TapSign Admin Dashboard</h1>
                            <p className="text-sm text-gray-600">Welcome, {user?.username}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Statistics Cards */}
                {statistics && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-gray-600 text-sm mb-2">Total Requests</div>
                            <div className="text-3xl font-bold text-gray-900">{statistics.total}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-gray-600 text-sm mb-2">Pending</div>
                            <div className="text-3xl font-bold text-yellow-600">{statistics.pending}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-gray-600 text-sm mb-2">Signed</div>
                            <div className="text-3xl font-bold text-green-600">{statistics.signed}</div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-gray-600 text-sm mb-2">Rejected</div>
                            <div className="text-3xl font-bold text-red-600">{statistics.rejected}</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filter by Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="signed">Signed</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search
                            </label>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Search by staff or boss name..."
                            />
                        </div>
                    </div>
                </div>

                {/* Requests Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Staff Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Boss Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                            No requests found
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{request.staffName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{request.bossName}</div>
                                                <div className="text-xs text-gray-500">{request.bossPhone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(request.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(request.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <a
                                                    href={request.statusLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    View
                                                </a>
                                                {request.status === 'SIGNED' && request.signedPdfUrl && (
                                                    <a
                                                        href={request.signedPdfUrl}
                                                        download
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Download
                                                    </a>
                                                )}
                                                {request.status === 'REJECTED' && request.rejectionReason && (
                                                    <button
                                                        onClick={() => alert(`Rejection Reason:\n\n${request.rejectionReason}`)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Reason
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                                    disabled={page === pagination.totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing page <span className="font-medium">{page}</span> of{' '}
                                        <span className="font-medium">{pagination.totalPages}</span> ({pagination.total} total)
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                                            disabled={page === pagination.totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
