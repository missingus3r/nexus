import mongoose from 'mongoose';

const paymentHistorySchema = new mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'UYU'],
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'mercadopago', 'paypal', 'stripe', 'manual'],
    default: 'manual'
  },
  transactionId: {
    type: String,
    description: 'External payment processor transaction ID'
  },
  paymentGateway: {
    type: String,
    enum: ['stripe', 'mercadopago', 'paypal', 'manual'],
    description: 'Payment gateway used'
  },
  description: {
    type: String,
    maxlength: 500,
    description: 'Payment description or notes'
  },
  billingPeriod: {
    start: Date,
    end: Date
  },
  metadata: {
    invoiceNumber: String,
    receiptUrl: String,
    cardLast4: String,
    cardBrand: String,
    ipAddress: String,
    userAgent: String,
    failureReason: String
  },
  refundInfo: {
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String,
    refundedBy: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    description: 'When payment was completed'
  }
}, {
  timestamps: true
});

// Indexes
paymentHistorySchema.index({ userId: 1, createdAt: -1 });
paymentHistorySchema.index({ subscriptionId: 1, createdAt: -1 });
paymentHistorySchema.index({ status: 1, createdAt: -1 });
paymentHistorySchema.index({ transactionId: 1 });

// Methods
paymentHistorySchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

paymentHistorySchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.metadata.failureReason = reason;
  return this.save();
};

paymentHistorySchema.methods.refund = function(amount, reason, refundedBy) {
  this.status = 'refunded';
  this.refundInfo = {
    refundedAt: new Date(),
    refundAmount: amount || this.amount,
    refundReason: reason,
    refundedBy
  };
  return this.save();
};

// Static methods
paymentHistorySchema.statics.getUserPaymentHistory = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('subscriptionId', 'plan planType')
    .exec();
};

paymentHistorySchema.statics.getSubscriptionPayments = function(subscriptionId) {
  return this.find({ subscriptionId })
    .sort({ createdAt: -1 })
    .exec();
};

paymentHistorySchema.statics.getTotalRevenue = async function(startDate, endDate) {
  const match = {
    status: 'completed'
  };

  if (startDate || endDate) {
    match.completedAt = {};
    if (startDate) match.completedAt.$gte = new Date(startDate);
    if (endDate) match.completedAt.$lte = new Date(endDate);
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$currency',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result;
};

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);

export default PaymentHistory;
