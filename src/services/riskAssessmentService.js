const { Payment, Customer } = require('../models');
const { logTransactionEvent } = require('../utils/logger');

class RiskAssessmentService {
  async calculateRiskScore(payment, customer) {
    let riskFactors = [];
    let score = 0;

    // Check transaction amount
    if (payment.amount > 1000) {
      score += 20;
      riskFactors.push('high_amount');
    }

    // Check customer history
    const customerTransactions = await Payment.count({
      where: { customer_id: customer.id, status: 'completed' }
    });
    if (customerTransactions < 3) {
      score += 15;
      riskFactors.push('new_customer');
    }

    // Check for rapid transactions
    const recentTransactions = await Payment.count({
      where: {
        customer_id: customer.id,
        created_at: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    if (recentTransactions > 5) {
      score += 25;
      riskFactors.push('rapid_transactions');
    }

    // Log risk assessment
    logTransactionEvent('Risk assessment completed', {
      payment_id: payment.id,
      risk_score: score,
      risk_factors: riskFactors
    });

    return { score, riskFactors };
  }

  async requiresDelayedCapture(riskScore) {
    return riskScore > 50;
  }
}

module.exports = new RiskAssessmentService();