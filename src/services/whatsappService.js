class WhatsAppService {
    /**
     * Generate WhatsApp link with custom message
     * @param {string} phoneNumber - Phone number in international format (+60123456789)
     * @param {string} message - Custom message
     * @returns {string} - wa.me link
     */
    generateLink(phoneNumber, message) {
        // Remove + and any spaces from phone number
        const cleanPhone = phoneNumber.replace(/[+\s]/g, '');

        // URL encode the message
        const encodedMessage = encodeURIComponent(message);

        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }

    /**
     * Generate default message for signature request
     * @param {string} staffName - Name of staff requesting signature
     * @param {string} shareableLink - Link to sign the document
     * @returns {string} - Default message template
     */
    getDefaultMessage(staffName, shareableLink) {
        return `Hello! ${staffName} has sent you a document to sign.\n\nPlease click the link below to review and sign:\n${shareableLink}\n\nThank you!`;
    }

    /**
     * Format phone number to international format
     * Assumes Malaysian numbers if no country code provided
     * @param {string} phoneNumber - Phone number
     * @returns {string} - Formatted phone number
     */
    formatPhoneNumber(phoneNumber) {
        // Remove all non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');

        // If starts with 0, assume Malaysian and replace with +60
        if (cleaned.startsWith('0')) {
            cleaned = '60' + cleaned.substring(1);
        }

        // If doesn't start with country code, assume Malaysian
        if (!cleaned.startsWith('60')) {
            cleaned = '60' + cleaned;
        }

        return '+' + cleaned;
    }
}

module.exports = new WhatsAppService();
