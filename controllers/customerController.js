const db = require('../config/db');
const Package = require('../models/Package');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const PromoCode = require('../models/PromoCode');

// Get all tour packages (Customer browsing)
exports.getAvailablePackages = async (req, res) => {
  try {
    const { search } = req.query;
    let packages;
    if (search) {
      packages = await Package.search(search);
    } else {
      packages = await Package.getAll();
    }
    res.json({ success: true, data: packages });
  } catch (error) {
    console.error('Customer Get Packages Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve tour packages.' });
  }
};

// Validate a promo code
exports.validatePromoCode = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Promo code is required.' });
    }

    const promo = await PromoCode.getByCode(code);
    if (!promo) {
      return res.json({ success: false, message: 'Invalid promo code.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(promo.expiry_date).toISOString().split('T')[0];

    if (promo.status !== 'active' || expiry < today) {
      return res.json({ success: false, message: 'This promo code has expired or is inactive.' });
    }

    res.json({
      success: true,
      message: `Promo code applied! You get a ${parseFloat(promo.discount_percent)}% discount.`,
      data: {
        id: promo.id,
        code: promo.code,
        discount_percent: parseFloat(promo.discount_percent)
      }
    });
  } catch (error) {
    console.error('Validate Promo Code Error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate promo code.' });
  }
};

// Get personal booking history
exports.getBookingHistory = async (req, res) => {
  try {
    const customerId = req.session.user.id;
    const bookings = await Booking.getByCustomerId(customerId);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Customer Booking History Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve booking history.' });
  }
};

// Customer self-books a package (Transaction-driven)
exports.bookPackage = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const customerId = req.session.user.id;
    const { package_id, travel_date, number_of_travelers, promo_code } = req.body;

    if (!package_id || !travel_date || !number_of_travelers) {
      return res.status(400).json({ success: false, message: 'Please provide package details and travel date.' });
    }

    // Get tour package details to calculate pricing
    const pack = await Package.getById(package_id);
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Selected tour package not found.' });
    }

    let totalPrice = pack.price * parseInt(number_of_travelers);
    let promoCodeId = null;
    let promoDiscount = 0;

    // Check and validate promo code if provided
    if (promo_code) {
      const promo = await PromoCode.getByCode(promo_code);
      if (promo) {
        const today = new Date().toISOString().split('T')[0];
        const expiry = new Date(promo.expiry_date).toISOString().split('T')[0];
        if (promo.status === 'active' && expiry >= today) {
          promoCodeId = promo.id;
          promoDiscount = parseFloat(promo.discount_percent);
          totalPrice = totalPrice - (totalPrice * promoDiscount) / 100;
        }
      }
    }

    // Get current customer profile to retrieve their assigned agent
    const customer = await Customer.getById(customerId);
    const agentId = customer ? customer.assigned_agent_id : null;

    await connection.beginTransaction();

    // 1. Create booking (triggers in DB will enforce total_price)
    const bookingId = await Booking.create(
      customerId,
      package_id,
      agentId,
      travel_date,
      number_of_travelers,
      totalPrice,
      promoCodeId,
      connection
    );

    // 2. Create pending payment record
    const transactionId = 'TXN-' + Math.floor(100000000 + Math.random() * 900000000);
    await Payment.create(
      bookingId,
      customerId,
      totalPrice,
      'Bank Transfer', // Placeholder until actual payment is processed
      transactionId,
      'pending',
      connection
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Booking request placed successfully! Please proceed to make your payment.',
      bookingId: bookingId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Customer Self Booking Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete booking request.' });
  } finally {
    connection.release();
  }
};

// Simulate Payment processing (Transaction-driven)
exports.processPayment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const customerId = req.session.user.id;
    const { booking_id, payment_method } = req.body;

    if (!booking_id || !payment_method) {
      return res.status(400).json({ success: false, message: 'Booking ID and Payment Method are required.' });
    }

    // Verify booking belongs to this customer
    const booking = await Booking.getById(booking_id);
    if (!booking || booking.customer_id !== customerId) {
      return res.status(403).json({ success: false, message: 'Access Denied. You do not own this booking.' });
    }

    if (booking.payment_status === 'completed') {
      return res.status(400).json({ success: false, message: 'This booking has already been paid.' });
    }

    await connection.beginTransaction();

    // 1. Update Payment status to 'completed'
    const paymentSql = "UPDATE payments SET status = 'completed', payment_method = ? WHERE booking_id = ?";
    await connection.execute(paymentSql, [payment_method, booking_id]);

    // 2. Update Booking status to 'confirmed'
    const bookingSql = "UPDATE bookings SET status = 'confirmed' WHERE id = ?";
    await connection.execute(bookingSql, [booking_id]);

    await connection.commit();
    res.json({
      success: true,
      message: 'Payment processed successfully! Your booking is now confirmed.',
      invoiceUrl: `/invoice/${booking_id}`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Process Payment Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Payment transaction failed. Please try again.' });
  } finally {
    connection.release();
  }
};

// Customer cancels their pending booking
exports.cancelBooking = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const customerId = req.session.user.id;
    const { id } = req.params;

    // Verify booking belongs to this customer
    const booking = await Booking.getById(id);
    if (!booking || booking.customer_id !== customerId) {
      return res.status(403).json({ success: false, message: 'Access Denied. You do not own this booking.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking is already cancelled.' });
    }

    await connection.beginTransaction();

    // Update Booking status to 'cancelled'
    await connection.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);

    // Update Payment status to 'refunded' if it was completed, or 'failed' if pending
    let nextPaymentStatus = 'failed';
    if (booking.payment_status === 'completed') {
      nextPaymentStatus = 'refunded';
    }
    await connection.execute("UPDATE payments SET status = ? WHERE booking_id = ?", [nextPaymentStatus, id]);

    await connection.commit();
    res.json({ success: true, message: 'Your booking has been cancelled successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Cancel Booking Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  } finally {
    connection.release();
  }
};
