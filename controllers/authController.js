// controllers/authController.js
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // Đảm bảo utils/sendEmail.js hoạt động
const crypto = require('crypto');
// const jwt = require('jsonwebtoken'); // Không cần trực tiếp ở đây nếu dùng method của model

// --- Hàm Helper: Gửi Token và Thông tin User An Toàn ---
const sendTokenResponse = (user, statusCode, res) => {
  try {
    const token = user.getSignedJwtToken(); // Gọi method từ model

    // Tùy chọn: Cấu hình cho cookie (an toàn hơn nếu dùng httpOnly)
    const cookieExpireDays = parseInt(process.env.JWT_COOKIE_EXPIRE || '30', 10);
    const options = {
      expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
      httpOnly: true, // Cookie không thể truy cập bằng JavaScript phía client
    };
    if (process.env.NODE_ENV === 'production') {
      options.secure = true; // Chỉ gửi cookie qua HTTPS ở production
      // options.sameSite = 'strict'; // Hoặc 'lax', tùy thuộc vào cross-site requests
    }

    // Chỉ trả về thông tin cần thiết, không bao gồm password hash, otp hash,...
    const userResponseData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res
      .status(statusCode)
      // .cookie('token', token, options) // Bỏ comment nếu muốn gửi token qua cookie
      .json({
        success: true,
        token, // Gửi token trong body để client lưu (ví dụ: localStorage)
        user: userResponseData,
      });
  } catch (error) {
      console.error("[sendTokenResponse] Error:", error);
      // Tránh gửi response lỗi ở đây vì có thể response header đã được gửi
      // Chỉ log lỗi
  }
};

// --- Controller Đăng ký ---
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;

  // --- Validate Input ---
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ tên, email và mật khẩu.' });
  }
  if (password.length < 6) {
     return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }
  // Thêm validate email format nếu cần (Mongoose đã làm nhưng có thể check sớm hơn)

  try {
    // --- Kiểm tra User tồn tại ---
    let existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      console.log(`[REGISTER] Attempt failed: Email ${email} already verified.`);
      return res.status(400).json({ success: false, message: 'Email này đã được đăng ký và xác thực.' });
    }
    if (existingUser && !existingUser.isVerified) {
      // Cho phép đăng ký lại để nhận OTP mới, xóa user cũ
      await User.deleteOne({ _id: existingUser._id });
      console.log(`[REGISTER] Removed existing unverified user: ${email}`);
    }

    // --- Tạo User Instance (Chưa lưu) ---
    // Mật khẩu ở đây là mật khẩu thô
    const user = new User({ name, email, password });
    console.log(`[REGISTER] Created User instance for ${email}. Password is raw.`);

    // --- Sinh OTP (Set hash OTP & expiry vào instance) ---
    const verificationOtp = user.getVerificationOtp();

    // --- Lưu User vào DB (Trigger pre('save') để hash password) ---
    await user.save({ validateBeforeSave: true }); // Quan trọng: Gọi save() để hook chạy
    console.log(`[REGISTER] User ${email} saved. Password should now be hashed.`);
    // --- Tùy chọn: Kiểm tra lại password đã hash trong DB ngay sau khi lưu ---
    // const checkUser = await User.findById(user._id).select('+password');
    // console.log(`[REGISTER] Password in DB after save for ${email}: ${checkUser.password.substring(0, 10)}...`); // Phải là hash

    // --- Gửi Email OTP ---
    const otpExpiryMinutes = process.env.EMAIL_VERIFY_TOKEN_EXPIRE || '10';
    const emailMessage = `Mã xác thực tài khoản Shoe Store của bạn là: ${verificationOtp}. Mã có hiệu lực ${otpExpiryMinutes} phút.`;
    const emailHtml = `<p>Mã xác thực của bạn: <strong>${verificationOtp}</strong> (Hiệu lực ${otpExpiryMinutes} phút)</p>`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Mã Xác Thực Email - Shoe Store',
        message: emailMessage,
        html: emailHtml,
      });
      console.log(`[REGISTER] Verification OTP sent to ${email}.`);

      // --- Phản hồi thành công ---
      res.status(201).json({ // 201 Created phù hợp hơn
        success: true,
        message: `Đăng ký thành công! Mã OTP đã được gửi tới ${user.email}. Vui lòng nhập mã để xác thực tài khoản.`,
      });

    } catch (emailError) {
      console.error('[REGISTER] Email Sending Error:', emailError);
      // Rollback: Xóa user nếu gửi mail lỗi
      try {
        await User.findByIdAndDelete(user._id);
        console.log(`[REGISTER] Rolled back: Removed user ${user.email} due to email send failure.`);
      } catch (deleteError) {
        console.error(`[REGISTER] Failed to rollback user ${user.email}:`, deleteError);
      }
      // Gửi lỗi về client
      return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi gửi mã OTP. Vui lòng thử đăng ký lại.' });
    }

  } catch (error) {
    console.error("[REGISTER] Overall Error:", error);
    // Xử lý lỗi Validation từ Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    // Xử lý lỗi trùng email (nếu logic xóa user cũ có vấn đề)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại hoặc có lỗi trùng lặp, vui lòng thử lại.' });
    }
    // Lỗi Server chung
    res.status(500).json({ success: false, message: 'Lỗi Server khi xử lý đăng ký.' });
  }
};

// --- Controller Xác thực OTP ---
exports.verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mã OTP.' });
  }
  if (otp.length !== 6 || !/^\d+$/.test(otp)) { // Validate OTP format
      return res.status(400).json({ success: false, message: 'Mã OTP phải là 6 chữ số.' });
  }

  try {
    console.log(`[VERIFY_OTP] Attempting verification for: ${email}`);
    // --- Tìm user và lấy cả trường OTP ---
    // Dùng .select() để lấy các trường đã bị ẩn trong schema
    const user = await User.findOne({ email }).select('+verificationOtp +verificationOtpExpire');

    if (!user) {
      console.log(`[VERIFY_OTP] User not found: ${email}`);
      return res.status(400).json({ success: false, message: 'Email hoặc mã OTP không đúng.' }); // Thông báo chung
    }

    if (user.isVerified) {
      console.log(`[VERIFY_OTP] Account already verified: ${email}`);
      return res.status(400).json({ success: false, message: 'Tài khoản này đã được xác thực.' });
    }

    // --- Kiểm tra OTP và thời hạn ---
    if (!user.verificationOtp || user.verificationOtpExpire < Date.now()) {
      console.log(`[VERIFY_OTP] OTP invalid or expired for: ${email}`);
      // Tùy chọn: Xóa OTP hết hạn nếu muốn
      // user.verificationOtp = undefined;
      // user.verificationOtpExpire = undefined;
      // await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
    }

    // --- Hash OTP nhập vào để so sánh ---
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // --- So sánh hash ---
    if (user.verificationOtp !== hashedOtp) {
      console.log(`[VERIFY_OTP] Invalid OTP provided for: ${email}`);
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác.' });
    }

    // --- Xác thực thành công: Cập nhật user ---
    console.log(`[VERIFY_OTP] OTP verified successfully for: ${email}`);
    user.isVerified = true;
    user.verificationOtp = undefined; // Xóa OTP sau khi dùng
    user.verificationOtpExpire = undefined;
    await user.save({ validateBeforeSave: false }); // Lưu thay đổi (không trigger hash pass)

    // --- Phản hồi thành công ---
    res.status(200).json({ success: true, message: 'Xác thực tài khoản thành công! Bạn có thể đăng nhập.' });

  } catch (error) {
    console.error("[VERIFY_OTP] Server Error:", error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi xác thực OTP.' });
  }
};


// --- Controller Đăng nhập ---
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.log('[LOGIN] Missing email or password');
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mật khẩu.' });
  }

  try {
    console.log(`[LOGIN] Attempting login for: ${email}`);
    // --- Tìm user và lấy cả password ---
    const user = await User.findOne({ email }).select('+password');

    // --- Kiểm tra User tồn tại ---
    if (!user) {
      console.log(`[LOGIN] User not found: ${email}`);
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không hợp lệ.' }); // Lỗi chung
    }

    // --- Kiểm tra trạng thái xác thực ---
    if (!user.isVerified) {
      console.log(`[LOGIN] Account not verified: ${email}`);
      return res.status(401).json({ success: false, message: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email và nhập mã OTP.' });
    }

    // --- So sánh mật khẩu ---
    const isMatch = await user.matchPassword(password);
    console.log(`[LOGIN] Password match result for ${email}: ${isMatch}`);

    if (!isMatch) {
      console.log(`[LOGIN] Incorrect password for: ${email}`);
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không hợp lệ.' }); // Lỗi chung
    }

    // --- Đăng nhập thành công: Gửi token ---
    console.log(`[LOGIN] Login successful for: ${email}`);
    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error("[LOGIN] Server Error:", error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi đăng nhập.' });
  }
};

// --- Controller Lấy Thông Tin User Hiện Tại ---
exports.getMe = async (req, res, next) => {
  // Middleware 'protect' đã xác thực token và gắn req.user
  // req.user chứa thông tin từ payload token (id, role)
  try {
    // Lấy thông tin user mới nhất từ DB dựa trên ID từ token
    // Loại bỏ các trường nhạy cảm không cần thiết
    const user = await User.findById(req.user.id)
        .select('-password -verificationOtp -verificationOtpExpire'); // Loại trừ các trường nhạy cảm

    if (!user) {
      // Trường hợp hiếm gặp: user bị xóa sau khi token được cấp
      console.log(`[GET_ME] User not found for ID: ${req.user.id}`);
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    console.log(`[GET_ME] Retrieved info for user: ${user.email}`);
    res.status(200).json({ success: true, data: user });

  } catch (error) {
    console.error("[GET_ME] Server Error:", error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi lấy thông tin người dùng.' });
  }
};


// --- Controller Đăng Xuất ---
exports.logout = async (req, res, next) => {
    // Chủ yếu dùng để xóa HTTPOnly cookie nếu có
    // Nếu token lưu ở client (localStorage), client tự xóa
    console.log(`[LOGOUT] User logout request received.`);
     // Tùy chọn: Xóa cookie
     res.cookie('token', 'none', {
         expires: new Date(Date.now() + 10 * 1000), // Hết hạn sau 10 giây
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         // sameSite: 'strict' // or 'lax'
     });

    res.status(200).json({ success: true, message: 'Đăng xuất thành công.' });
};