import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial';
export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'Online' | 'Cheque' | 'UPI' | 'Razorpay' | 'Card';
export type BillType = 'rent' | 'maintenance' | 'deposit' | 'other';

export interface IPayment extends Document {
  _id:               mongoose.Types.ObjectId;
  property:          mongoose.Types.ObjectId;
  tenant:            mongoose.Types.ObjectId;
  owner:             mongoose.Types.ObjectId;
  amount:            number;
  dueDate:           Date;
  paidDate?:         Date;
  status:            PaymentStatus;
  method?:           PaymentMethod;
  month:             string;
  billType:          BillType;
  receiptNo:         string;
  notes?:            string;
  remindersSent:     string[];   
  razorpayOrderId?:  string;
  razorpayPaymentId?: string;
  createdAt:         Date;
  updatedAt:         Date;
}

const PaymentSchema = new Schema<IPayment>({
  property:  { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant:    { type: Schema.Types.ObjectId, ref: 'User',     required: true },
  owner:     { type: Schema.Types.ObjectId, ref: 'User',     required: true },
  amount:    { type: Number, required: true, min: 0 },
  dueDate:   { type: Date,   required: true },
  paidDate:  { type: Date },
  status:    { type: String, enum: ['pending','paid','overdue','partial'], default: 'pending' },
  method:    { type: String, enum: ['Bank Transfer','Cash','Online','Cheque','UPI','Razorpay','Card'] },
  month:     { type: String, required: true },
  billType:  { type: String, enum: ['rent','maintenance','deposit','other'], default: 'rent' },
  receiptNo: { type: String, unique: true, sparse: true },
  notes:     { type: String, trim: true },
  remindersSent: { type: [String], default: [] },  // NEW: tracks sent reminders
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },
}, { timestamps: true });

PaymentSchema.index({ tenant: 1, status: 1 });
PaymentSchema.index({ owner:  1, status: 1 });
PaymentSchema.index({ property: 1, month: 1, billType: 1 }, { unique: true });

PaymentSchema.pre('save', function (next) {
  if (!this.receiptNo && this.status === 'paid') {
    this.receiptNo = `SL-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  }
  next();
});

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
