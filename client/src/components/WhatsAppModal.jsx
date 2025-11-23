import { useState } from 'react';

export default function WhatsAppModal({ shareableLink, staffName, bossPhone, onClose }) {
    const [customMessage, setCustomMessage] = useState(
        `Hello! ${staffName} has sent you a document to sign.\n\nPlease click the link below to review and sign:\n${shareableLink}\n\nThank you!`
    );

    const handleSend = () => {
        const cleanPhone = bossPhone.replace(/[+\s]/g, '');
        const encodedMessage = encodeURIComponent(customMessage);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                <h2 className="text-2xl font-bold mb-4">Customize WhatsApp Message</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message to send:
                    </label>
                    <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleSend}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                        📱 Send via WhatsApp
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
