const express = require('express');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadSingleImage, handleUploadError } = require('../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Quản lý Sản phẩm
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Lấy danh sách sản phẩm (có phân trang, lọc, sắp xếp)
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Số lượng sản phẩm mỗi trang
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: "-createdAt"
 *         description: Tiêu chí sắp xếp
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Lọc theo thương hiệu
 *     responses:
 *       '200':
 *         description: Danh sách sản phẩm thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 12
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 12
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       '500':
 *         description: Lỗi Server
 */
router.get('/', getAllProducts);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Tạo sản phẩm mới (Yêu cầu quyền Admin và Upload ảnh)
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - imageFile
 *               - categoryId
 *               - sizeId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên sản phẩm
 *               description:
 *                 type: string
 *                 description: Mô tả sản phẩm
 *               price:
 *                 type: number
 *                 description: Giá sản phẩm
 *               stock:
 *                 type: integer
 *                 description: Số lượng tồn kho
 *               brand:
 *                 type: string
 *                 description: Thương hiệu sản phẩm
 *               categoryId:
 *                 type: string
 *                 description: ID danh mục sản phẩm
 *               sizeId:
 *                 type: string
 *                 description: ID kích cỡ sản phẩm
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh sản phẩm
 *     responses:
 *       '201':
 *         description: Tạo sản phẩm thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Dữ liệu không hợp lệ.
 *       '401':
 *         description: Chưa đăng nhập hoặc token không hợp lệ.
 *       '403':
 *         description: Không có quyền Admin.
 *       '500':
 *         description: Lỗi Server
 */
router.post('/', protect, authorize('admin'), uploadSingleImage, createProduct, handleUploadError);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Lấy chi tiết một sản phẩm bằng ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm
 *     responses:
 *       '200':
 *         description: Lấy chi tiết thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       '400':
 *         description: ID không hợp lệ.
 *       '404':
 *         description: Không tìm thấy sản phẩm.
 *       '500':
 *         description: Lỗi Server
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Cập nhật thông tin sản phẩm (Yêu cầu quyền Admin)
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm cần cập nhật
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên sản phẩm
 *               description:
 *                 type: string
 *                 description: Mô tả sản phẩm
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               brand:
 *                 type: string
 *               imageFile:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh mới
 *     responses:
 *       '200':
 *         description: Cập nhật thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Dữ liệu không hợp lệ.
 *       '401':
 *         description: Chưa đăng nhập hoặc token không hợp lệ.
 *       '403':
 *         description: Không có quyền Admin.
 *       '404':
 *         description: Không tìm thấy sản phẩm.
 *       '500':
 *         description: Lỗi Server
 */
router.put('/:id', protect, authorize('admin'), uploadSingleImage, updateProduct, handleUploadError);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Xóa một sản phẩm (Yêu cầu quyền Admin)
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của sản phẩm cần xóa
 *     responses:
 *       '200':
 *         description: Xóa thành công.
 *       '400':
 *         description: ID không hợp lệ.
 *       '401':
 *         description: Chưa đăng nhập hoặc token không hợp lệ.
 *       '403':
 *         description: Không có quyền Admin.
 *       '404':
 *         description: Không tìm thấy sản phẩm.
 *       '500':
 *         description: Lỗi Server
 */
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
