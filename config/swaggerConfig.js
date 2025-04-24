const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0', // Version của OpenAPI Specification
    info: {
      title: 'Shoe Store API',
      version: '1.0.0',
      description: 'API documentation for the Shoe Store application managing products and users.',
      contact: {
        name: 'Your Name / Company',
      },
    },
    servers: [ // Danh sách server API
      {
        url: `http://localhost:${process.env.PORT || 5000}`, // URL gốc của API
        description: 'Development server'
      },
    ],
    // --- Định nghĩa các Schemas tái sử dụng ---
    components: {
      schemas: {
        // --- Các Schemas đã có ---
        ProductInput: {
          type: 'object',
          required: ['name', 'price', 'image'],
          properties: { /* ... */ }
        },
        Product: {
           allOf: [
             { $ref: '#/components/schemas/ProductInput' },
             { type: 'object', properties: { _id: { type: 'string' }, discountedPrice: { type: 'string' }, createdAt: { type: 'string' }, updatedAt: { type: 'string' } } }
           ]
        },
        UserInput: { /* ... */ },
        UserLogin: { /* ... */ },
        UserResponse: { /* ... */ },
        AuthTokenResponse: { /* ... */ },
        ErrorResponse: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Resource not found' }
            }
        },
        SuccessResponse: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Operation successful' }
            }
        },

        // --- BỔ SUNG CÁC SCHEMAS THIẾU CHO ORDER VÀ CART ---
        ShippingAddress: {
            type: 'object',
            required: ['fullName', 'phone', 'address1', 'city', 'postalCode', 'country'],
            properties: {
                fullName: { type: 'string', example: 'John Doe', description: 'Full name of the recipient' },
                phone: { type: 'string', example: '0912345678', description: 'Phone number of the recipient' },
                address1: { type: 'string', example: '123 Main St', description: 'Detailed address (e.g., street, house number)' },
                city: { type: 'string', example: 'Anytown' },
                postalCode: { type: 'string', example: '12345' },
                country: { type: 'string', example: 'Vietnam' }
            }
        },
         // Giả định cấu trúc Item trong Order khác với CartItem đơn giản
        OrderItem: {
            type: 'object',
            required: ['name', 'quantity', 'image', 'price', 'product'],
            properties: {
                name: { type: 'string', example: 'Awesome Running Shoes' },
                quantity: { type: 'integer', example: 1 },
                image: { type: 'string', format: 'url', example: 'http://example.com/shoe.jpg' },
                price: { type: 'number', format: 'float', example: 1250000 },
                product: { type: 'string', description: 'ID sản phẩm (ref Product model)' },
                size: { type: 'string', description: 'ID kích cỡ (ref Size model)', example: '42' }, // Bổ sung nếu lưu size/color cụ thể
                color: { type: 'string', example: 'Black' }
                // Thêm các trường khác nếu model OrderItem có
            }
        },
        // Cấu trúc đơn giản của CartItem nếu nó khác OrderItem
        // Nếu CartItem chỉ là tham chiếu đến Product và số lượng, có thể định nghĩa như sau:
        // CartItem: {
        //     type: 'object',
        //     required: ['product', 'quantity'],
        //     properties: {
        //         product: { $ref: '#/components/schemas/Product' }, // hoặc chỉ ID: { type: 'string' }
        //         quantity: { type: 'integer', example: 2 },
        //         size: { type: 'string', example: '42' }, // Nếu size là phần của CartItem
        //         color: { type: 'string', example: 'Red' } // Nếu color là phần của CartItem
        //     }
        // },
        Order: {
            type: 'object',
            required: ['user', 'orderItems', 'shippingAddress', 'paymentMethod', 'itemsPrice', 'totalPrice', 'status'],
            properties: {
                _id: { type: 'string', example: '605c72ef3e9f5a2c74f5b3a4' },
                user: { $ref: '#/components/schemas/UserResponse' }, // Tham chiếu user
                orderItems: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/OrderItem' } // Mảng các item trong đơn hàng
                },
                shippingAddress: { $ref: '#/components/schemas/ShippingAddress' }, // Tham chiếu địa chỉ
                paymentMethod: { type: 'string', enum: ['COD', 'Card', 'PayPal', 'Momo', 'VNPay', 'ZaloPay'], example: 'COD' },
                itemsPrice: { type: 'number', format: 'float', example: 2500000 }, // Tổng giá trị các mặt hàng
                shippingPrice: { type: 'number', format: 'float', example: 50000 }, // Phí vận chuyển
                taxPrice: { type: 'number', format: 'float', example: 0 }, // Thuế (nếu có)
                totalPrice: { type: 'number', format: 'float', example: 2550000 }, // Tổng cộng
                isPaid: { type: 'boolean', example: false },
                paidAt: { type: 'string', format: 'date-time', nullable: true }, // Ngày thanh toán (nếu đã thanh toán)
                isDelivered: { type: 'boolean', example: false },
                deliveredAt: { type: 'string', format: 'date-time', nullable: true }, // Ngày giao hàng (nếu đã giao)
                 status: { type: 'string', enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Failed'], example: 'Pending' }, // Trạng thái đơn hàng
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
                // Thêm các trường khác nếu có như paymentResult (link đến PaymentResult schema)
            }
        },
        PaymentResult: {
             type: 'object',
             properties: {
                 id: { type: 'string', description: 'ID giao dịch từ cổng thanh toán', example: 'pay_abc123' },
                 status: { type: 'string', description: 'Trạng thái giao dịch', example: 'completed' },
                 update_time: { type: 'string', format: 'date-time', description: 'Thời gian cập nhật trạng thái' },
                 email_address: { type: 'string', format: 'email', description: 'Email liên kết với thanh toán (ví dụ: PayPal)' },
                 // ZaloPay specific fields
                 app_trans_id: { type: 'string', description: 'ZaloPay transaction ID generated by our app', example: '220415_123456_abcdef' },
                 zp_trans_id: { type: 'string', description: 'ZaloPay transaction ID from ZaloPay system', example: '220415000001' },
                 order_url: { type: 'string', description: 'URL to ZaloPay payment page', example: 'https://sbpayment.zalopay.vn/v2/payment/...' }
             }
        },
         // Nếu bạn có schema cho Cart (cho API quản lý giỏ hàng riêng), bạn cũng có thể định nghĩa ở đây.
         // Nhưng ở đây bạn chỉ tham chiếu CartItem trong response createOrder, có thể không cần schema Cart đầy đủ.
         // Nếu cần, định nghĩa Cart:
         // Cart: {
         //     type: 'object',
         //     properties: {
         //         _id: { type: 'string' },
         //         user: { type: 'string' }, // User ID
         //         items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } }, // Mảng CartItem
         //         createdAt: { type: 'string', format: 'date-time' },
         //         updatedAt: { type: 'string', format: 'date-time' }
         //     }
         // },
         // Định nghĩa đơn giản cho CartItem nếu nó được trả về riêng lẻ
        CartItem: {
             type: 'object',
             properties: {
                 _id: { type: 'string' },
                 product: { $ref: '#/components/schemas/Product' }, // Có thể trả về đầy đủ product
                 quantity: { type: 'integer', example: 2 },
                 size: { type: 'string', example: '42' }, // Nếu size là phần của CartItem model
                 color: { type: 'string', example: 'Red' }, // Nếu color là phần của CartItem model
                 createdAt: { type: 'string', format: 'date-time' },
                 updatedAt: { type: 'string', format: 'date-time' }
             }
         }


        // --- Kết thúc BỔ SUNG ---
      },
      // --- Định nghĩa Security Scheme (JWT) ---
      securitySchemes: {
          bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'Enter JWT token obtained after login'
          }
      }
    }
  },
  apis: ['./routes/*.js'], // Chỉ định thư mục routes
};

module.exports = swaggerJsdoc(swaggerOptions);