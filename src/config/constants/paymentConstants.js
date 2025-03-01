module.exports = {
PAYMENT_CONSTANTS: {
    PROVIDERS: {
        MOBILE_MONEY: {
            AIRTEL: 'AIRTEL_MONEY',
            TNM: 'TNM_MPAMBA',
            MTN: 'MTN_MONEY',
            MPESA: 'M_PESA'
        },
        BANK_CARD: {
            NMB: 'NMB_BANK',
            CRDB: 'CRDB_BANK',
            NBM: 'NATIONAL_BANK',
            STANDARD: 'STANDARD_BANK'
        }
    },
    LIMITS: {
        MOBILE_MONEY: {
            DAILY_MAX: 500000,
            TRANSACTION_MAX: 150000
        },
        BANK_CARD: {
            DAILY_MAX: 1000000,
            TRANSACTION_MAX: 500000
        }
    },
    STATUS: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        FAILED: 'failed',
        REFUNDED: 'refunded',
        CANCELLED: 'cancelled',
        VERIFIED: 'verified'
    }
},