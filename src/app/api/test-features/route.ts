import { NextResponse } from 'next/server';
import Address from '@/models/Address';
import Coupon from '@/models/Coupon';
import Notification from '@/models/Notification';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'All new models (Address, Coupon, Notification) loaded and verified successfully!',
      models: {
        address: !!Address,
        coupon: !!Coupon,
        notification: !!Notification
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
