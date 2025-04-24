// controllers/cartController.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    Lấy giỏ hàng của người dùng đang đăng nhập
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res, next) => {
    const userId = req.user.id; // Lấy từ middleware 'protect'
    console.log(`[GetCart] User ID: ${userId}`);

    try {
        // 1. Find the user
        const user = await User.findById(userId);
        if (!user) {
            console.log(`[GetCart] User not found: ${userId}`);
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
        }

        console.log(`[GetCart] Fetching cart for user: ${userId}`);
        // Tìm giỏ hàng và populate thông tin sản phẩm (tên, ảnh, giá, tồn kho)
        // Điều này đảm bảo thông tin hiển thị luôn là mới nhất
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.product', // Populate trường 'product' bên trong mảng 'items'
            select: 'name image price stock isOnSale discount discountedPrice sizes category brand material', // Chọn các trường cần thiết của Product, bao gồm 'sizes'
            populate: { // Populate the sizes within the product
              path: 'sizes',
              select: 'name type' // Select fields from the Size model
            }
        });

        if (!cart) {
            // Nếu user chưa có giỏ hàng, tạo một giỏ hàng trống cho họ
            console.log(`[GetCart] No cart found for user: ${userId}. Creating empty cart.`);
            const newCart = await Cart.create({ user: userId, items: [] });
            return res.status(200).json({ success: true, data: newCart });
            // Hoặc trả về null/mảng rỗng tùy logic frontend:
            // return res.status(200).json({ success: true, data: null });
        }

        // --- Quan trọng: Kiểm tra và cập nhật giỏ hàng nếu sản phẩm không còn tồn tại hoặc hết hàng ---
        // let cartUpdated = false;
        // const validItems = [];
        // for (const item of cart.items) {
        //      // Kiểm tra xem sản phẩm có được populate thành công không (tức là còn tồn tại)
        //      if (item.product && item.size) { // Check if product and size are populated
        //          // Check if the size selected for the item is actually available for the product
        //          const sizeAvailableForProduct = item.product.sizes.some(
        //              productSize => productSize._id.equals(item.size._id)
        //          );

        //          if (sizeAvailableForProduct) {
        //              // Kiểm tra tồn kho của size cụ thể (nếu cần logic phức tạp hơn)
        //              // Ví dụ đơn giản: kiểm tra tổng tồn kho
        //              if (item.product.stock >= item.quantity) {
        //                  validItems.push(item);
        //              } else {
        //                  // Nếu hết hàng, có thể xóa item hoặc cập nhật quantity về 0/1 tùy logic
        //                  console.warn(`[GetCart] Item removed/updated due to stock issue: User ${userId}, Product ${item.product._id}, Size ${item.size.name} (${item.size._id}), Qty ${item.quantity}, Stock ${item.product.stock}`);
        //                  cartUpdated = true; // Đánh dấu giỏ hàng cần cập nhật
        //                  // Option 1: Xóa item
        //                  // Option 2: Cập nhật quantity = 0 hoặc stock tối đa (nếu muốn giữ lại)
        //                  // Ở đây ta sẽ loại bỏ nó khỏi kết quả trả về
        //              }
        //          } else {
        //              // Size selected for the item is not available for the product
        //              console.warn(`[GetCart] Item removed because size not available for product: User ${userId}, Product ${item.product._id}, Size ${item.size.name} (${item.size._id})`);
        //              cartUpdated = true;
        //          }
        //      } else {
        //          // Sản phẩm hoặc Size không còn tồn tại trong DB
        //          console.warn(`[GetCart] Item removed because product or size not found: User ${userId}, ProductID ${item.product ? item.product._id : 'N/A'}, SizeID ${item.size ? item.size._id : 'N/A'}`);
        //          cartUpdated = true;
        //      }
        // }

        // // Nếu có thay đổi, cập nhật lại giỏ hàng trong DB và trả về giỏ hàng đã cập nhật
        // if (cartUpdated) {
        //     console.log(`[GetCart] Cart updated for user ${userId} due to product/stock changes. Saving...`);
        //     cart.items = validItems; // Gán lại mảng items hợp lệ
        //     const updatedCart = await cart.save();
        //      // Populate lại sau khi save để đảm bảo data nhất quán
        //     await updatedCart.populate({
        //         path: 'items.product',
        //         select: 'name image price stock isOnSale discount discountedPrice sizes category brand material',
        //     });
        //     await Product.populate(updatedCart, { path: 'items.product.sizes', select: 'name type' });
        //     return res.status(200).json({ success: true, data: updatedCart });
        // }
        // --- Kết thúc kiểm tra ---

        console.log(`[GetCart] Cart retrieved successfully for user: ${userId}`);
        res.status(200).json({ success: true, data: cart });

    } catch (error) {
        console.error(`[GetCart] Error fetching cart for user ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Lỗi Server khi lấy thông tin giỏ hàng.' });
    }
};

// @desc    Thêm sản phẩm vào giỏ hàng hoặc cập nhật số lượng nếu đã tồn tại
// @route   POST /api/cart/items
// @access  Private
exports.addItemToCart = async (req, res, next) => {
  const { productId, quantity, sizeId } = req.body;
  const userId = req.user.id;
  
  // --- Validate Input ---
  if (!productId || !quantity || !sizeId) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ ID sản phẩm, số lượng và ID size.' });
  }

  // Validate if sizeId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(sizeId)) {
    return res.status(400).json({ success: false, message: 'ID size không hợp lệ.' });
  }

  const numQuantity = parseInt(quantity, 10);
  if (isNaN(numQuantity) || numQuantity <= 0) {
    return res.status(400).json({ success: false, message: 'Số lượng phải là một số nguyên dương.' });
  }

  try {
    console.log(`[AddItemToCart] User: ${userId}, Product: ${productId}, Size: ${sizeId}, Quantity: ${numQuantity}`);

    // 1. Tìm giỏ hàng của user (hoặc tạo mới nếu chưa có)
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      console.log(`[AddItemToCart] No cart found for user ${userId}, creating new cart.`);
      cart = new Cart({ user: userId, items: [] });
    }

    // 2. Kiểm tra sản phẩm tồn tại và có đủ hàng không, populate sizes
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }
    const productSize = product.sizes;
    console.log(`[AddItemToCart] Product sizes ngoai:`, productSize);

    // 3. Kiểm tra xem size có hợp lệ và có sẵn cho sản phẩm không
    console.log(`[AddItemToCart] Product sizes: ${JSON.stringify(productSize)}`);
    const sizeObject = product.sizes.find(s => s._id.equals(sizeId));
    if (!sizeObject) {
      return res.status(400).json({ success: false, message: `Size với ID "${sizeId}" không có sẵn cho sản phẩm này.` });
    }

    // 4. Kiểm tra tồn kho tổng quát (logic kiểm tra theo size phức tạp hơn)
    if (product.stock < numQuantity) {
      return res.status(400).json({ success: false, message: `Số lượng tồn kho tổng quát không đủ (Còn lại: ${product.stock}).` });
    }

    // 5. Kiểm tra xem sản phẩm với size đó đã có trong giỏ chưa
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && item.size.equals(sizeObject._id)
    );

    if (existingItemIndex > -1) {
      // --- Sản phẩm + size đã tồn tại -> Cập nhật số lượng ---
      const newQuantity = cart.items[existingItemIndex].quantity + numQuantity;
      // Kiểm tra lại tồn kho với số lượng mới
      if (product.stock < newQuantity) {
        return res.status(400).json({ success: false, message: `Số lượng tồn kho không đủ để thêm ${numQuantity} sản phẩm (Tổng cần: ${newQuantity}, Còn lại: ${product.stock}).` });
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      console.log(`[AddItemToCart] Updated quantity for existing item. Product: ${productId}, Size: ${sizeId}, New Qty: ${newQuantity}`);
    } else {
      // --- Sản phẩm + size chưa có -> Thêm item mới ---
      cart.items.push({ product: productId, quantity: numQuantity, size: sizeObject._id });
      console.log(`[AddItemToCart] Added new item. Product: ${productId}, Size: ${sizeId}, Qty: ${numQuantity}`);
    }

    // 6. Lưu giỏ hàng đã cập nhật
    const updatedCart = await cart.save();

    // 7. Populate lại để trả về thông tin đầy đủ
    await updatedCart.populate({
      path: 'items.product',
      select: 'name image price stock isOnSale discount discountedPrice sizes category brand material',
      populate: {
        path: 'sizes',
        select: 'name type'
      }
    });
    await updatedCart.populate({ // Populate the size within the cart item
      path: 'items.size',
      select: 'name type'
    });
    await Product.populate(updatedCart, { path: 'items.product.sizes', select: 'name type' });

    res.status(200).json({ success: true, message: 'Thêm vào giỏ hàng thành công!', data: updatedCart });

  } catch (error) {
    console.error(`[AddItemToCart] Error adding item for user ${userId}:`, error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Lỗi Server khi thêm sản phẩm vào giỏ hàng.' });
  }
};

// @desc    Cập nhật số lượng của một item trong giỏ hàng
// @route   PUT /api/cart/items/:productId/:sizeId
// @access  Private
exports.updateCartItemQuantity = async (req, res, next) => {
    const { productId, sizeId } = req.params; // Lấy productId và size từ URL params
    const { quantity } = req.body;
    const userId = req.user.id;

     // --- Validate Input ---
    if (!quantity) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số lượng mới.' });
    }
    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity <= 0) {
        // Nếu số lượng <= 0, coi như là yêu cầu xóa item
        // return removeItemFromCart(req, res, next); // Gọi hàm xóa (cần tạo hàm này)
         return res.status(400).json({ success: false, message: 'Số lượng phải là một số nguyên dương. Để xóa, vui lòng sử dụng API xóa.' });
    }

    try {
        console.log(`[UpdateCartItem] User: ${userId}, Product: ${productId}, Size: ${sizeId}, New Quantity: ${numQuantity}`);

        // 1. Tìm giỏ hàng
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giỏ hàng.' });
        }

        // 2. Tìm item cần cập nhật trong giỏ hàng
        // 2. Tìm item cần cập nhật trong giỏ hàng
        // Validate if sizeId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(sizeId)) {
            return res.status(400).json({ success: false, message: 'ID size không hợp lệ.' });
        }

        // Find the product to get the size object
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
        }

        const sizeObject = product.sizes.find(s => s._id.equals(sizeId));
        if (!sizeObject) {
            return res.status(400).json({ success: false, message: `Size với ID "${sizeId}" không có sẵn cho sản phẩm này.` });
        }

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size.equals(sizeObject._id) // Compare Size ObjectIds
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Sản phẩm với size này không tìm thấy trong giỏ hàng.' });
        }

        // 3. Kiểm tra sản phẩm và tồn kho
        if (!product) {
            // Nếu sản phẩm không còn tồn tại, xóa khỏi giỏ hàng
            cart.items.splice(itemIndex, 1);
            await cart.save();
            return res.status(404).json({ success: false, message: 'Sản phẩm không còn tồn tại và đã được xóa khỏi giỏ.' });
        }
        if (product.stock < numQuantity) {
            return res.status(400).json({ success: false, message: `Số lượng tồn kho không đủ (Còn lại: ${product.stock}). Vui lòng cập nhật lại số lượng.` });
        }

        // 4. Cập nhật số lượng
        cart.items[itemIndex].quantity = numQuantity;
        console.log(`[UpdateCartItem] Quantity updated successfully.`);

        // 5. Lưu giỏ hàng
        const updatedCart = await cart.save();

        // 6. Populate và trả về
         // 6. Populate và trả về, bao gồm cả Size details
          await updatedCart.populate({
            path: 'items.product',
            select: 'name image price stock isOnSale discount discountedPrice sizes category brand material', // Include 'sizes'
            populate: { // Populate the sizes within the product
              path: 'sizes',
              select: 'name type'
            }
        });
        await updatedCart.populate({ // Populate the size within the cart item
            path: 'items.size',
            select: 'name type'
        });

        res.status(200).json({ success: true, message: 'Cập nhật giỏ hàng thành công!', data: updatedCart });

    } catch (error) {
        console.error(`[UpdateCartItem] Error updating item for user ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Lỗi Server khi cập nhật giỏ hàng.' });
    }
};

// @desc    Xóa một item khỏi giỏ hàng
// @route   DELETE /api/cart/items/:productId/:size
// @access  Private
exports.removeItemFromCart = async (req, res, next) => {
    const { productId, sizeId } = req.params; // Lấy từ URL params
    const userId = req.user.id;

    try {
        console.log(`[RemoveCartItem] User: ${userId}, Product: ${productId}, Size: ${sizeId}`);
        // 1. Tìm giỏ hàng
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            // Thực tế không nên xảy ra nếu user đã có hành động trước đó
             return res.status(404).json({ success: false, message: 'Không tìm thấy giỏ hàng.' });
        }

        // 2. Tìm vị trí item cần xóa
        const initialLength = cart.items.length;
        // Validate if sizeId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(sizeId)) {
            return res.status(400).json({ success: false, message: 'ID size không hợp lệ.' });
        }

        // Find the product to get the size object
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
        }

        const sizeObject = product.sizes.find(s => s._id.equals(sizeId));
        if (!sizeObject) {
            return res.status(400).json({ success: false, message: `Size với ID "${sizeId}" không có sẵn cho sản phẩm này.` });
        }

        cart.items = cart.items.filter(
            item => !(item.product.toString() === productId && item.size.equals(sizeObject._id)) // Compare Size ObjectIds
        );

        // 3. Kiểm tra xem có item nào bị xóa không
        if (cart.items.length === initialLength) {
             return res.status(404).json({ success: false, message: 'Sản phẩm với size này không tìm thấy trong giỏ hàng để xóa.' });
        }

        console.log(`[RemoveCartItem] Item removed.`);

        // 4. Lưu giỏ hàng sau khi xóa
        const updatedCart = await cart.save();

        // 5. Populate và trả về (hoặc chỉ cần trả về success message)
        await updatedCart.populate({
            path: 'items.product',
            select: 'name image price stock isOnSale discount discountedPrice size category brand material',
        });

        res.status(200).json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng.', data: updatedCart });

    } catch (error) {
         console.error(`[RemoveCartItem] Error removing item for user ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Lỗi Server khi xóa sản phẩm khỏi giỏ hàng.' });
    }
};

// @desc    Xóa toàn bộ giỏ hàng
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
    const userId = req.user.id;

    try {
        console.log(`[ClearCart] Clearing cart for user: ${userId}`);
        const cart = await Cart.findOne({ user: userId });

        if (cart) {
            cart.items = []; // Xóa hết items
            await cart.save();
            console.log(`[ClearCart] Cart cleared successfully.`);
            res.status(200).json({ success: true, message: 'Đã xóa toàn bộ giỏ hàng.', data: cart }); // Trả về giỏ rỗng
        } else {
             console.log(`[ClearCart] No cart found to clear for user: ${userId}`);
             res.status(200).json({ success: true, message: 'Giỏ hàng đã trống.', data: null });
        }
    } catch (error) {
         console.error(`[ClearCart] Error clearing cart for user ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Lỗi Server khi xóa giỏ hàng.' });
    }
};