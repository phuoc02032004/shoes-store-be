// controllers/productController.js
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary'); // Import config Cloudinary
const streamifier = require('streamifier'); // Dùng để tạo stream từ buffer

// --- Helper Function: Upload file buffer to Cloudinary ---
const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) {
      return reject(new Error('Không có dữ liệu file để tải lên.'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName, // Thư mục trên Cloudinary
        resource_type: 'image', // Chỉ chấp nhận ảnh qua middleware rồi
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Stream Error:', error);
          return reject(new Error('Lỗi khi tải ảnh lên Cloudinary.'));
        }
        if (result) {
          console.log('Cloudinary Upload Success:', result.public_id, result.secure_url);
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        } else {
          reject(new Error('Không nhận được kết quả hợp lệ từ Cloudinary.'));
        }
      }
    );
    // Pipe buffer vào stream
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// --- Helper Function: Delete resource from Cloudinary ---
const deleteFromCloudinary = async (publicId) => {
    if (!publicId) {
        console.warn('[DeleteFromCloudinary] No publicId provided, skipping delete.');
        return { result: 'no_id' }; // Không có gì để xóa
    }
    try {
        console.log(`[DeleteFromCloudinary] Attempting to delete resource: ${publicId}`);
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        console.log('[DeleteFromCloudinary] Deletion Result:', publicId, result);
        // Trả về 'ok' hoặc 'not found'
        return result;
    } catch (error) {
        console.error(`[DeleteFromCloudinary] Failed to delete resource ${publicId}:`, error);
        // Không throw lỗi ở đây để không chặn các tiến trình khác (như xóa DB), chỉ log
        return { result: 'error', error: error.message };
    }
};


// --- Controller Lấy Tất Cả Sản Phẩm ---
// @desc    Lấy danh sách sản phẩm (có thể thêm phân trang, lọc, sắp xếp)
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res, next) => {
  try {
    // --- Logic Phân trang, Lọc, Sắp xếp (Ví dụ cơ bản) ---
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12; // Số sản phẩm mỗi trang
    const skip = (page - 1) * limit;

    // Xây dựng bộ lọc (filter)
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.brand) {
      filter.brand = req.query.brand;
    }
    if (req.query.isOnSale === 'true') {
      filter.isOnSale = true;
    }
    if (req.query.isPopular === 'true') {
      filter.isPopular = true;
    }
    // Thêm các bộ lọc khác nếu cần (price range, isNew,...)

    // Xây dựng tùy chọn sắp xếp (sort)
    const sort = {};
    if (req.query.sort) {
      // Ví dụ: sort=-createdAt (mới nhất), sort=price (giá tăng), sort=-price (giá giảm)
      const sortBy = req.query.sort.split(',').join(' ');
      sort[sortBy] = 1; // Mongoose syntax requires space separation
      if (sortBy.startsWith('-')) {
           sort[sortBy.substring(1)] = -1;
           delete sort[sortBy];
      }
    } else {
      sort.createdAt = -1; // Mặc định sắp xếp theo mới nhất
    }

    // --- Query Database ---
    console.log(`[GetAllProducts] Querying DB - Page: ${page}, Limit: ${limit}, Filter: ${JSON.stringify(filter)}, Sort: ${JSON.stringify(sort)}`);
    const products = await Product.find(filter)
                                   .sort(sort)
                                   .skip(skip)
                                   .limit(limit);

    // Lấy tổng số sản phẩm (để tính tổng số trang)
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      success: true,
      count: products.length, // Số lượng trên trang hiện tại
      pagination: {
        totalProducts,
        totalPages,
        currentPage: page,
        limit,
      },
      data: products,
    });
  } catch (error) {
    console.error("[GetAllProducts] Server Error:", error);
    res.status(500).json({ success: false, message: 'Lỗi Server khi lấy danh sách sản phẩm.' });
  }
};


// --- Controller Lấy Chi Tiết Sản Phẩm ---
// @desc    Lấy chi tiết một sản phẩm bằng ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi Server khi lấy chi tiết sản phẩm.' });
  }
};


// --- Controller Tạo Sản Phẩm Mới ---
// @desc    Tạo sản phẩm mới (có upload ảnh)
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res, next) => {
  let uploadedImagePublicId = null; // Lưu tạm publicId để rollback nếu cần

  try {
    const { name, description, price, stock, brand, categoryId, sizeId } = req.body; // Destructure dữ liệu từ req.body
    const productData = { name, description, price, stock, brand, category: categoryId, sizes: [sizeId] }; // Tạo object productData và thêm category, sizes
    console.log('[CreateProduct] Received data:', productData);

    // --- Kiểm tra file ảnh --- và các trường bắt buộc ---
    if (!name || !description || !price || !stock || !brand || !categoryId || !sizeId ) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin sản phẩm: Tên, Mô tả, Giá, Stock, Brand, categoryId và sizeId.' });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Vui lòng tải lên ảnh sản phẩm (trường "imageFile").' });
    }
    console.log('[CreateProduct] Image file received:', req.file.originalname, req.file.mimetype, req.file.size);

    // --- Validate categoryId and sizeId ---
    if (!categoryId) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp categoryId.' });
    }
    if (!sizeId) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp sizeId.' });
    }

    // --- Upload ảnh lên Cloudinary ---
    console.log('[CreateProduct] Uploading image to Cloudinary...');
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'shoe_store/products'); // Lưu vào thư mục 'shoe_store/products'
    uploadedImagePublicId = cloudinaryResult.public_id; // Lưu lại để có thể xóa nếu lỗi DB

    // --- Gán thông tin ảnh và ID size, category vào dữ liệu sản phẩm ---
    productData.image = cloudinaryResult.secure_url;
    productData.imagePublicId = cloudinaryResult.public_id;
   productData.sizes = [sizeId]; // Sửa thành sizes (mảng)
   productData.category = categoryId;
185 |
    // --- Tạo sản phẩm trong DB với sizeId và categoryId ---
    console.log('[CreateProduct] Creating product in Database...');
    const product = await Product.create(productData);
    console.log('[CreateProduct] Product created successfully:', product._id);

    res.status(201).json({ success: true, data: product });

  } catch (error) {
    console.error("[CreateProduct] Error:", error);

    // --- Rollback: Xóa ảnh đã upload lên Cloudinary nếu tạo DB lỗi ---
    if (uploadedImagePublicId) {
      console.warn(`[CreateProduct] DB Error occurred after Cloudinary upload. Attempting to delete image: ${uploadedImagePublicId}`);
      await deleteFromCloudinary(uploadedImagePublicId);
    }

    // --- Xử lý lỗi cụ thể ---
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: `Lỗi validation: ${messages.join('. ')}` });
    }
    // Lỗi server chung
    res.status(500).json({ success: false, message: 'Lỗi Server khi tạo sản phẩm.' });
  }
};


// --- Controller Cập Nhật Sản Phẩm ---
// @desc    Cập nhật sản phẩm (có thể có upload ảnh mới)
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res, next) => {
  const productId = req.params.id;
  const updateData = req.body; // Dữ liệu text cần cập nhật
  let newUploadedPublicId = null; // Lưu public_id của ảnh MỚI (nếu có) để rollback
  let oldPublicId = null; // Lưu public_id của ảnh CŨ

  try {
    console.log(`[UpdateProduct] Attempting to update product ID: ${productId}`);
    console.log('[UpdateProduct] Received update data:', updateData);

    // --- Tìm sản phẩm hiện có ---
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để cập nhật.' });
    }
    oldPublicId = existingProduct.imagePublicId; // Lưu lại public_id cũ

    // --- Xử lý upload ảnh MỚI (nếu có) ---
    if (req.file) {
      console.log('[UpdateProduct] New image file detected. Uploading to Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'shoe_store/products');
      newUploadedPublicId = cloudinaryResult.public_id; // Lưu lại để rollback nếu DB lỗi

      // Gán thông tin ảnh mới vào dữ liệu cập nhật
      updateData.image = cloudinaryResult.secure_url;
      updateData.imagePublicId = cloudinaryResult.public_id;
      console.log(`[UpdateProduct] New image uploaded. PublicID: ${newUploadedPublicId}`);
    } else {
       console.log('[UpdateProduct] No new image file uploaded.');
       // Đảm bảo không vô tình xóa publicId cũ nếu không có ảnh mới
       if (updateData.imagePublicId === '') delete updateData.imagePublicId;
       if (updateData.image === '') delete updateData.image;
    }

   // --- Handle sizes (if provided in updateData, expecting array of objects: [{category, system, value}, ...]) ---
   if (updateData.sizes !== undefined) { // Check if sizes field is present in the update data
        let newSizeIds = [];
        // Allow sending an empty array to clear sizes
        if (Array.isArray(updateData.sizes)) {
             if (updateData.sizes.length > 0) { // Only process if the array is not empty
                 try {
                     const sizeQueries = updateData.sizes.map(s => {
                         if (!s || typeof s !== 'object' || !s.category || !s.system || !s.value) { // Added check for object type
                             throw new Error(`Đối tượng size không hợp lệ: ${JSON.stringify(s)}. Phải là object chứa category, system, và value.`);
                         }
                         return Size.findOne({ category: s.category, system: s.system, value: s.value }).select('_id').lean(); // Use lean
                     });
                     const foundSizes = await Promise.all(sizeQueries);

                     const notFoundSizeDetails = [];
                     newSizeIds = foundSizes.map((foundSize, index) => {
                         if (!foundSize) {
                             notFoundSizeDetails.push(`(${updateData.sizes[index].category}/${updateData.sizes[index].system}/${updateData.sizes[index].value})`);
                         }
                         return foundSize ? foundSize._id : null;
                     }).filter(id => id !== null); // Filter out nulls

                     if (notFoundSizeDetails.length > 0) {
                          throw new Error(`Không tìm thấy các size sau trong database: ${notFoundSizeDetails.join(', ')}. Vui lòng tạo size trước.`);
                     }
                     // Check if all requested sizes were found
                     if (newSizeIds.length !== updateData.sizes.length) {
                          throw new Error('Số lượng size tìm thấy không khớp với số lượng yêu cầu.');
                     }

                 } catch (sizeError) {
                     // Rollback Cloudinary upload before returning error
                     if (newUploadedPublicId) {
                         console.warn(`[UpdateProduct] Rolling back new Cloudinary upload due to size error: ${newUploadedPublicId}`);
                         await deleteFromCloudinary(newUploadedPublicId);
                     }
                     console.error("[UpdateProduct] Size processing error:", sizeError);
                     return res.status(400).json({ success: false, message: `Lỗi xử lý size: ${sizeError.message}` });
                 }
             }
             // If the input was an array (empty or processed), assign the result (which could be empty)
             updateData.sizes = newSizeIds; // Assign the new array of ObjectIds (or empty array) to updateData
        } else {
             // If 'sizes' is provided but not a valid array
             if (newUploadedPublicId) {
                 console.warn(`[UpdateProduct] Rolling back new Cloudinary upload due to invalid sizes format: ${newUploadedPublicId}`);
                 await deleteFromCloudinary(newUploadedPublicId);
             }
             return res.status(400).json({ success: false, message: 'Trường "sizes" phải là một mảng các đối tượng size ({category, system, value}).' });
        }
   } // If updateData.sizes is undefined, it's simply not updated.

   // --- Cập nhật sản phẩm trong DB ---
   console.log('[UpdateProduct] Updating product in Database...');
   const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, {
      new: true, // Trả về document mới nhất sau khi cập nhật
      runValidators: true, // Chạy lại validation của Mongoose
      context: 'query'
    });

    if (!updatedProduct) {
        // Trường hợp hiếm: Tìm thấy ban đầu nhưng update thất bại
        throw new Error('Cập nhật sản phẩm thất bại sau khi tìm thấy.');
    }
    console.log('[UpdateProduct] Product updated successfully in DB:', updatedProduct._id);

    // --- Xóa ảnh CŨ trên Cloudinary (NẾU có ảnh MỚI được upload THÀNH CÔNG VÀ ảnh cũ tồn tại) ---
    if (newUploadedPublicId && oldPublicId && oldPublicId !== newUploadedPublicId) {
      console.log(`[UpdateProduct] Deleting old Cloudinary image: ${oldPublicId}`);
      await deleteFromCloudinary(oldPublicId); // Xóa ảnh cũ
    }

    res.status(200).json({ success: true, data: updatedProduct });

  } catch (error) {
    console.error(`[UpdateProduct] Error updating product ${productId}:`, error);

    // --- Rollback: Xóa ảnh MỚI đã upload lên Cloudinary nếu cập nhật DB lỗi ---
    if (newUploadedPublicId) {
      console.warn(`[UpdateProduct] DB Error occurred after new image upload. Attempting to delete new image: ${newUploadedPublicId}`);
      await deleteFromCloudinary(newUploadedPublicId);
    }

    // --- Xử lý lỗi cụ thể ---
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: `Lỗi validation: ${messages.join('. ')}` });
    }
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ.' });
    }
    // Lỗi server chung
    res.status(500).json({ success: false, message: 'Lỗi Server khi cập nhật sản phẩm.' });
  }
};


// --- Controller Xóa Sản Phẩm ---
// @desc    Xóa sản phẩm (và ảnh trên Cloudinary)
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res, next) => {
  const productId = req.params.id;

  try {
    console.log(`[DeleteProduct] Attempting to delete product ID: ${productId}`);

    // --- Tìm sản phẩm để lấy publicId TRƯỚC KHI xóa khỏi DB ---
    const productToDelete = await Product.findById(productId);

    if (!productToDelete) {
      console.log(`[DeleteProduct] Product not found: ${productId}`);
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để xóa.' });
    }
    const publicIdToDelete = productToDelete.imagePublicId; // Lấy publicId

    // --- Xóa sản phẩm khỏi MongoDB ---
    console.log(`[DeleteProduct] Deleting product ${productId} from MongoDB...`);
    await productToDelete.deleteOne(); // Hoặc Product.findByIdAndDelete(productId);
    console.log(`[DeleteProduct] Product ${productId} deleted from MongoDB.`);

    // --- Xóa ảnh khỏi Cloudinary (nếu có publicId) ---
    await deleteFromCloudinary(publicIdToDelete); // Gọi helper để xóa

    res.status(200).json({ success: true, message: 'Sản phẩm đã được xóa thành công.' });
    // Hoặc res.status(204).send();

  } catch (error) {
    console.error(`[DeleteProduct] Error deleting product ${productId}:`, error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi Server khi xóa sản phẩm.' });
  }
};
