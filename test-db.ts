import mongoose from 'mongoose';
import Address from './src/models/Address';
import Coupon from './src/models/Coupon';
import Notification from './src/models/Notification';

async function testModels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techstar');
    console.log('✅ Database connected successfully for testing!');

    const dummyAddress = new Address({
      userId: new mongoose.Types.ObjectId(),
      title: 'Home',
      name: 'Aminul Islam',
      phone: '01700000000',
      address: 'House 12, Road 5',
      area: 'Banani',
      city: 'Dhaka',
      division: 'Dhaka',
      country: 'Bangladesh',
      isDefault: true
    });
    await dummyAddress.validate();
    console.log('✨ Address Schema Validation Passed!');

    const dummyCoupon = new Coupon({
      code: 'TECHSTAR10',
      discountType: 'percentage',
      discountValue: 10,
      minOrder: 1000,
      expiryDate: new Date('2026-09-30'),
      usageLimit: 100
    });
    await dummyCoupon.validate();
    console.log('✨ Coupon Schema Validation Passed!');

    const dummyNotification = new Notification({
      userId: new mongoose.Types.ObjectId(),
      title: 'Order Confirmed',
      message: 'Your order #TS10025 has been confirmed.',
      type: 'order',
      isRead: false
    });
    await dummyNotification.validate();
    console.log('✨ Notification Schema Validation Passed!');

    console.log('🚀 All new models are fully operational and verified!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testModels();
